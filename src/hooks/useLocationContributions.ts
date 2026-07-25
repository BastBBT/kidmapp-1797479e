import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EquipKey } from '@/assets/icons';

export type ValidatedContribution = {
  id: string;
  location_id: string;
  user_id: string | null;
  content: string | null;
  high_chair: boolean | null;
  changing_table: boolean | null;
  kids_area: boolean | null;
  kids_menu: boolean | null;
  bookable: string | null;
  status: string;
  created_at: string;
  language: string | null;
  profiles?: { full_name: string | null } | null;
};

export type EquipVoteCounts = Record<EquipKey, { yes: number; no: number }>;

const parseContributionContent = (content: string | null) => {
  if (!content) return null;
  const trimmed = content.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as { comment?: unknown; equipment?: Partial<Record<EquipKey, unknown>> };
    return {
      comment: typeof parsed.comment === 'string' ? parsed.comment.trim() || null : null,
      equipment: parsed.equipment ?? {},
    };
  } catch {
    return { comment: trimmed, equipment: {} };
  }
};

export function useLocationContributions(locationId: string) {
  return useQuery({
    queryKey: ['location-contributions', locationId],
    enabled: !!locationId,
    queryFn: async () => {
      // user_id is not exposed to anonymous visitors (column-level GRANT excludes
      // it from the `anon` role) — selecting it would fail without an auth session.
      const isAuthed = !!(await supabase.auth.getSession()).data.session;
      const projection = isAuthed
        ? 'id, location_id, user_id, content, high_chair, changing_table, kids_area, kids_menu, bookable, status, created_at, language'
        : 'id, location_id, content, high_chair, changing_table, kids_area, kids_menu, bookable, status, created_at, language';
      const { data, error } = await supabase
        .from('contributions')
        .select(projection)
        .eq('location_id', locationId)
        .eq('status', 'validated')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = (data ?? []) as unknown as ValidatedContribution[];

      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter((x): x is string => !!x)));
      const profilesMap = new Map<string, { full_name: string | null }>();
      if (userIds.length > 0) {
        const { data: profs, error: pErr } = await (supabase as any)
          .rpc('get_contributor_names', { _ids: userIds });
        if (pErr) {
          console.warn('Impossible de récupérer les noms des contributeurs', pErr);
        }
        for (const p of ((profs ?? []) as unknown as Array<{ id: string; full_name: string | null }>)) {
          profilesMap.set(p.id, { full_name: p.full_name });
        }
      }
      const contributions: ValidatedContribution[] = rows.map((r) => {
        const parsedContent = parseContributionContent(r.content);
        return {
          ...r,
          content: parsedContent?.comment ?? null,
          high_chair: r.high_chair ?? (typeof parsedContent?.equipment?.high_chair === 'boolean' ? parsedContent.equipment.high_chair : null),
          changing_table: r.changing_table ?? (typeof parsedContent?.equipment?.changing_table === 'boolean' ? parsedContent.equipment.changing_table : null),
          kids_area: r.kids_area ?? (typeof parsedContent?.equipment?.kids_area === 'boolean' ? parsedContent.equipment.kids_area : null),
          kids_menu: r.kids_menu ?? (typeof parsedContent?.equipment?.kids_menu === 'boolean' ? parsedContent.equipment.kids_menu : null),
          profiles: r.user_id ? profilesMap.get(r.user_id) ?? null : null,
        };
      });

      const votes: EquipVoteCounts = {
        high_chair: { yes: 0, no: 0 },
        changing_table: { yes: 0, no: 0 },
        kids_area: { yes: 0, no: 0 },
        kids_menu: { yes: 0, no: 0 },
      };
      let bookable_yes = 0;
      const contributors = new Set<string>();
      let commentCount = 0;

      for (const c of contributions) {
        (['high_chair', 'changing_table', 'kids_area', 'kids_menu'] as EquipKey[]).forEach((k) => {
          if (c[k] === true) votes[k].yes++;
          else if (c[k] === false) votes[k].no++;
        });
        if (c.bookable === 'yes') bookable_yes++;
        if (c.user_id) contributors.add(c.user_id);
        if (c.content && c.content.trim().length > 0) commentCount++;
      }

      return {
        contributions,
        votes,
        bookable_yes,
        contributorCount: contributors.size,
        commentCount,
      };
    },
  });
}
