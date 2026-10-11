import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import DigestSection from '@/components/account/DigestSection';
import type { ProfileSettings } from '@/hooks/useProfileSettings';

const updatePreferences = vi.fn().mockResolvedValue(undefined);
let settings: ProfileSettings;

vi.mock('@/hooks/useProfileSettings', () => ({
  useProfileSettings: () => ({
    settings,
    updateDigest: vi.fn(),
    updatePreferences,
    isSavingDigest: false,
  }),
}));

// Prochaines vacances lues en base : un seul appel chaîné, réponse figée.
vi.mock('@/integrations/supabase/client', () => {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'gte', 'order', 'limit']) chain[m] = () => chain;
  chain.maybeSingle = async () => ({ data: { first_day: '2099-10-17', last_day: '2099-11-01' }, error: null });
  return { supabase: { from: () => chain } };
});

// Pas de @testing-library/dom dans le repo : rendu React direct + petites
// requêtes DOM, suffisant pour ce composant.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;

async function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <QueryClientProvider client={client}>
        <DigestSection open onOpenChange={() => {}} />
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  return {
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function byRole(role: string, name?: string | RegExp): HTMLElement | null {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(role === 'button' ? 'button' : `[role="${role}"]`));
  return (
    nodes.find((n) => {
      if (role === 'button' && n.getAttribute('role')) return false;
      if (name === undefined) return true;
      const text = n.textContent ?? '';
      return typeof name === 'string' ? text === name : name.test(text);
    }) ?? null
  );
}

function allByRole(role: string, name: string): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('button')).filter(
    (n) => !n.getAttribute('role') && n.textContent === name && role === 'button',
  );
}

function hasText(text: string | RegExp): boolean {
  const all = Array.from(container.querySelectorAll<HTMLElement>('*'));
  return all.some((n) => {
    const own = Array.from(n.childNodes)
      .filter((c) => c.nodeType === Node.TEXT_NODE)
      .map((c) => c.textContent)
      .join('');
    const full = n.textContent ?? '';
    return typeof text === 'string' ? own === text || (n.children.length === 0 && full === text) : text.test(full);
  });
}

function click(el: HTMLElement | null) {
  expect(el).not.toBeNull();
  act(() => {
    el!.click();
  });
}

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

const base: ProfileSettings = {
  createdAt: null,
  zoneCity: 'Nantes',
  zoneDistrict: null,
  zoneLat: 47.2,
  zoneLng: -1.55,
  zoneRadiusKm: 10,
  digestEmailEnabled: true,
  digestPushEnabled: false,
  digestDay: 4,
  digestDays: 'all',
  digestHolidaysAllWeek: true,
  digestEventCategories: null,
  alertLocationCategories: null,
};

describe('DigestSection — personnalisation', () => {
  beforeEach(async () => {
    updatePreferences.mockClear();
    document.body.innerHTML = '';
    await i18n.changeLanguage('fr');
  });

  it('choisir « Le week-end » écrit digest_days', async () => {
    settings = { ...base };
    await renderSection();
    click(byRole('radio', /^Le week-end/));
    expect(updatePreferences).toHaveBeenCalledWith({ digest_days: 'weekend' });
  });

  it('l’interrupteur vacances est masqué sur « Toute la semaine », visible sinon', async () => {
    settings = { ...base, digestDays: 'all' };
    const { unmount } = await renderSection();
    expect(byRole('switch')).toBeNull();
    unmount();

    settings = { ...base, digestDays: 'weekend' };
    await renderSection();
    const toggle = byRole('switch') as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    click(toggle);
    expect(updatePreferences).toHaveBeenCalledWith({ digest_holidays_all_week: false });
  });

  it('affiche les prochaines vacances lues en base', async () => {
    settings = { ...base, digestDays: 'weekend' };
    await renderSection();
    await flush();
    expect(hasText(/Zone B · prochaines vacances du 17 oct\. au 1 nov\./)).toBe(true);
  });

  it('décocher « Marché » depuis tout coché écrit la liste sans Marché', async () => {
    settings = { ...base };
    await renderSection();
    const marche = byRole('button', 'Marché');
    expect(marche?.getAttribute('aria-pressed')).toBe('true');
    click(marche);
    expect(updatePreferences).toHaveBeenCalledWith({
      digest_event_categories: ['Spectacle', 'Atelier', 'Festival', 'Fête', 'Exposition', 'Autre'],
    });
  });

  it('« Tout cocher » remet les lieux à null', async () => {
    settings = { ...base, alertLocationCategories: ['nature'] };
    await renderSection();
    expect(byRole('button', 'Restaurant')?.getAttribute('aria-pressed')).toBe('false');
    click(allByRole('button', 'Tout cocher')[1]);
    expect(updatePreferences).toHaveBeenCalledWith({ alert_location_categories: null });
  });

  it('le récap résume les choix', async () => {
    settings = { ...base, digestDays: 'weekend', digestEventCategories: ['Atelier', 'Spectacle'] };
    await renderSection();
    expect(
      hasText(
        'Chaque jeudi, les sorties du samedi et du dimanche, et de toute la semaine pendant les vacances scolaires (2 types sur 7). Nouveaux lieux : 11 catégories sur 11.',
      ),
    ).toBe(true);
  });

  it('les libellés existent en anglais et en espagnol', async () => {
    settings = { ...base, digestDays: 'weekend' };
    await i18n.changeLanguage('en');
    const { unmount } = await renderSection();
    expect(hasText("When you're free")).toBe(true);
    expect(hasText('During school holidays, all week')).toBe(true);
    unmount();
    await i18n.changeLanguage('es');
    await renderSection();
    expect(hasText('Salidas que nos interesan')).toBe(true);
  });
});
