import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { ChildAgeBucket, bucketForChildMonths } from '@/lib/ageFilter';
import {
  ALL_CHILDREN_SELECTION,
  Child,
  ChildFilterSelection,
  ageInMonths,
  resolveAgeBucketsForSelection,
} from '@/lib/children';
import {
  getAgeBandSeen,
  isHookSnoozed,
  loadSelectedFilter,
  saveSelectedFilter,
  setAgeBandSeen,
  snoozeHook as persistSnoozeHook,
} from '@/lib/childrenStorage';

export interface ChildInput {
  firstName?: string | null;
  birthMonth: number;
  birthYear: number;
}

export interface AgeBandCrossing {
  child: Child;
  from: ChildAgeBucket;
  to: ChildAgeBucket;
}

interface ChildrenContextValue {
  children: Child[];
  isLoading: boolean;
  selection: ChildFilterSelection;
  setSelection: (selection: ChildFilterSelection) => void;
  resolvedBuckets: Set<ChildAgeBucket>;
  addChild: (input: ChildInput) => Promise<void>;
  updateChild: (id: string, input: ChildInput) => Promise<void>;
  deleteChild: (id: string) => Promise<void>;
  wantsHookSheet: boolean;
  requestHookIfNeeded: () => void;
  closeHookSheet: (viaRegister: boolean) => void;
  wantsCaptureFlow: boolean;
  openCaptureFlow: () => void;
  closeCaptureFlow: () => void;
  ageBandCrossing: AgeBandCrossing | null;
  acknowledgeAgeBandCrossing: () => void;
}

const ChildrenContext = createContext<ChildrenContextValue | null>(null);

// Sheets de capture (hook + formulaire) montées ici, à la racine — jamais
// dans une page — pour ne pas disparaître au changement d'onglet/page.
export const ChildrenProvider = ({ children: appChildren }: { children: ReactNode }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const childrenQueryKey = ['children', user?.id];

  const { data: kids = [], isLoading } = useQuery({
    queryKey: childrenQueryKey,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [selection, setSelectionState] = useState<ChildFilterSelection>(() => loadSelectedFilter());
  const setSelection = useCallback((next: ChildFilterSelection) => {
    setSelectionState(next);
    saveSelectedFilter(next);
  }, []);

  const resolvedBuckets = useMemo(() => resolveAgeBucketsForSelection(selection, kids), [selection, kids]);

  const invalidateChildren = () => queryClient.invalidateQueries({ queryKey: childrenQueryKey });

  const addChildMutation = useMutation({
    mutationFn: async (input: ChildInput) => {
      const wasEmpty = kids.length === 0;
      const { error } = await supabase.from('children').insert({
        user_id: user!.id,
        first_name: input.firstName?.trim() || null,
        birth_month: input.birthMonth,
        birth_year: input.birthYear,
      });
      if (error) throw error;
      return { wasEmpty };
    },
    onSuccess: ({ wasEmpty }) => {
      invalidateChildren();
      // Premier enfant ajouté : payoff immédiat, pas d'action supplémentaire
      // requise pour voir un filtre s'appliquer.
      if (wasEmpty) setSelection(ALL_CHILDREN_SELECTION);
    },
  });

  const updateChildMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ChildInput }) => {
      const { error } = await supabase
        .from('children')
        .update({
          first_name: input.firstName?.trim() || null,
          birth_month: input.birthMonth,
          birth_year: input.birthYear,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidateChildren,
  });

  const deleteChildMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('children').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidateChildren,
  });

  // --- Hook contextuel (écran 2) ---
  const [wantsHookSheet, setWantsHookSheet] = useState(false);
  const requestHookIfNeeded = useCallback(() => {
    if (kids.length > 0) return;
    if (isHookSnoozed()) return;
    setWantsHookSheet(true);
  }, [kids.length]);
  // Toute fermeture sans passer par "Enregistrer mes enfants" (bouton "Plus
  // tard" ou fermeture de la sheet) relance le snooze de 30 jours.
  const closeHookSheet = useCallback((viaRegister: boolean) => {
    setWantsHookSheet(false);
    if (!viaRegister) persistSnoozeHook();
  }, []);

  const [wantsCaptureFlow, setWantsCaptureFlow] = useState(false);
  const openCaptureFlow = useCallback(() => setWantsCaptureFlow(true), []);
  const closeCaptureFlow = useCallback(() => setWantsCaptureFlow(false), []);

  // --- Célébration de franchissement de tranche ---
  const [ageBandCrossing, setAgeBandCrossing] = useState<AgeBandCrossing | null>(null);
  const lastCheckedIds = useRef<string>('');
  useEffect(() => {
    if (kids.length === 0) return;
    const idsKey = kids.map((c) => c.id).join(',');
    if (idsKey === lastCheckedIds.current) return;
    lastCheckedIds.current = idsKey;

    for (const child of kids) {
      const current = bucketForChildMonths(ageInMonths(child));
      const stored = getAgeBandSeen(child.id);
      if (stored === null) {
        // Un enfant jamais vu ne déclenche pas de célébration à son premier
        // chargement — juste l'enregistrement de sa tranche comme référence.
        setAgeBandSeen(child.id, current);
        continue;
      }
      if (stored !== current) {
        setAgeBandCrossing((prev) => {
          // Un franchissement déjà en attente d'acquittement n'est jamais
          // écrasé : celui-ci sera redétecté au prochain fetch.
          if (prev) return prev;
          setAgeBandSeen(child.id, current);
          return { child, from: stored, to: current };
        });
      }
    }
  }, [kids]);

  const acknowledgeAgeBandCrossing = useCallback(() => setAgeBandCrossing(null), []);

  // Reset au changement de compte (pas seulement à la déconnexion) : sans ça,
  // changer de compte sur le même navigateur afficherait transitoirement les
  // enfants du compte précédent le temps du refetch.
  const prevUserId = useRef<string | null>(null);
  useEffect(() => {
    const nextId = user?.id ?? null;
    if (prevUserId.current && prevUserId.current !== nextId) {
      queryClient.removeQueries({ queryKey: ['children', prevUserId.current] });
      setAgeBandCrossing(null);
      lastCheckedIds.current = '';
    }
    prevUserId.current = nextId;
  }, [user?.id, queryClient]);

  const value: ChildrenContextValue = {
    children: kids,
    isLoading,
    selection,
    setSelection,
    resolvedBuckets,
    addChild: async (input) => {
      await addChildMutation.mutateAsync(input);
    },
    updateChild: async (id, input) => {
      await updateChildMutation.mutateAsync({ id, input });
    },
    deleteChild: async (id) => {
      await deleteChildMutation.mutateAsync(id);
    },
    wantsHookSheet,
    requestHookIfNeeded,
    closeHookSheet,
    wantsCaptureFlow,
    openCaptureFlow,
    closeCaptureFlow,
    ageBandCrossing,
    acknowledgeAgeBandCrossing,
  };

  return <ChildrenContext.Provider value={value}>{appChildren}</ChildrenContext.Provider>;
};

export const useChildren = (): ChildrenContextValue => {
  const ctx = useContext(ChildrenContext);
  if (!ctx) throw new Error('useChildren must be used within ChildrenProvider');
  return ctx;
};
