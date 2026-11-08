import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import i18n from '@/i18n';
import EventSpotlightSheet from '@/components/EventSpotlightSheet';
import type { ActiveSpotlight } from '@/hooks/useActiveSpotlight';
import type { EventItem } from '@/types/event';

const navigate = vi.fn();
const logSpotlight = vi.fn();
const downloadIcs = vi.fn();
let active: ActiveSpotlight | null;

vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' }, isLoading: false }) }));
vi.mock('@/hooks/useActiveSpotlight', () => ({ useActiveSpotlight: () => ({ data: active }) }));
vi.mock('@/lib/spotlightLog', () => ({ logSpotlight: (p: unknown) => logSpotlight(p) }));
vi.mock('@/lib/ics', () => ({ downloadIcs: (e: unknown) => downloadIcs(e) }));

/** Stockage en mémoire : l'environnement de test n'expose pas de localStorage utilisable. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
    key: (i) => Array.from(data.keys())[i] ?? null,
  };
}

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;

const event = {
  id: 'e1', name: 'Le Grand Voyage de Pomme', category: 'Spectacle', address: 'Théâtre de la Rue, Nantes',
  date_start: '2026-11-21', date_end: null, time: '10:30:00', age_min_months: 36, age_max_months: null,
  price: 'Gratuit', photo: null, status: 'published',
} as unknown as EventItem;

const spotlight = (over: Partial<ActiveSpotlight> = {}): ActiveSpotlight => ({
  rule: { id: 's1', starts_on: '2026-11-12', ends_on: '2026-11-21', frequency: 'weekend', last_reminder: true },
  headline: 'Le spectacle à ne pas rater ce week-end',
  message: 'Marionnettes et musique live.',
  showCalendarCta: true,
  showPhoto: true,
  event,
  occurrence: null,
  eventDay: '2026-11-21',
  ...over,
});

const render = async (props: { ready?: boolean; blocked?: boolean } = {}) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<EventSpotlightSheet ready={props.ready ?? true} blocked={props.blocked ?? false} />);
  });
};
const wait = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
const dialog = () => document.body.querySelector('[role="dialog"]');
const button = (text: string) => Array.from(document.body.querySelectorAll('button')).find((b) => b.textContent?.includes(text));

describe('EventSpotlightSheet', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('fr');
    vi.useFakeTimers();
    // Jeudi 12 novembre 2026, 13 h : le week-end a commencé, la sortie est dans 9 jours.
    vi.setSystemTime(new Date(2026, 10, 12, 13, 0));
    vi.stubGlobal('localStorage', memoryStorage());
    active = spotlight();
    navigate.mockClear();
    logSpotlight.mockClear();
    downloadIcs.mockClear();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('attend 1,5 s après le chargement de la liste, puis s’ouvre avec l’accroche et la sortie', async () => {
    await render();
    await wait(1400);
    expect(dialog()).toBeNull();
    await wait(200);
    const d = dialog();
    expect(d).not.toBeNull();
    expect(d?.getAttribute('aria-modal')).toBe('true');
    expect(d?.textContent).toContain('Le spectacle à ne pas rater ce week-end');
    expect(d?.textContent).toContain('Le Grand Voyage de Pomme');
    expect(d?.textContent).toContain('À la une');
    expect(logSpotlight).toHaveBeenCalledWith({ spotlightId: 's1', kind: 'shown', isLast: false, userId: 'u1' });
  });

  it('ne s’ouvre pas tant que la liste n’est pas chargée', async () => {
    await render({ ready: false });
    await wait(5000);
    expect(dialog()).toBeNull();
  });

  it('laisse la place à une autre fenêtre et ne s’invite pas après coup', async () => {
    await render({ blocked: true });
    await wait(1600);
    expect(dialog()).toBeNull();
    act(() => root.render(<EventSpotlightSheet ready blocked={false} />));
    await wait(5000);
    expect(dialog()).toBeNull();
    expect(logSpotlight).not.toHaveBeenCalled();
  });

  it('ne revient pas la même semaine une fois montrée', async () => {
    await render();
    await wait(1600);
    expect(dialog()).not.toBeNull();
    act(() => root.unmount());
    container.remove();
    await render();
    await wait(1600);
    expect(dialog()).toBeNull();
  });

  it('au dernier rappel, l’étiquette devient un compte à rebours', async () => {
    vi.setSystemTime(new Date(2026, 10, 19, 13, 0));
    await render();
    await wait(1600);
    expect(dialog()?.textContent).toContain('Dans 2 jours');
    expect(logSpotlight).toHaveBeenCalledWith(expect.objectContaining({ kind: 'shown', isLast: true }));
  });

  it('« Ajouter au calendrier » télécharge le fichier, journalise et passe en « Ajoutée à ton agenda »', async () => {
    await render();
    await wait(1600);
    act(() => button('Ajouter au calendrier')?.click());
    expect(downloadIcs).toHaveBeenCalledWith(event);
    expect(logSpotlight).toHaveBeenCalledWith(expect.objectContaining({ kind: 'calendar' }));
    expect(dialog()?.textContent).toContain('Ajoutée à ton agenda');
    act(() => button('Ajoutée à ton agenda')?.click());
    expect(downloadIcs).toHaveBeenCalledTimes(1);
  });

  it('au rappel, une sortie déjà ajoutée affiche « Déjà dans ton agenda »', async () => {
    vi.setSystemTime(new Date(2026, 10, 12, 13, 0));
    await render();
    await wait(1600);
    act(() => button('Ajouter au calendrier')?.click());
    act(() => root.unmount());
    container.remove();
    vi.setSystemTime(new Date(2026, 10, 18, 9, 0));
    await render();
    await wait(1600);
    expect(dialog()?.textContent).toContain('Déjà dans ton agenda');
    expect(dialog()?.textContent).toContain('Dans 3 jours');
    act(() => button('Déjà dans ton agenda')?.click());
    expect(downloadIcs).toHaveBeenCalledTimes(1);
  });

  it('une sortie à plusieurs créneaux part dans l’agenda avec les dates du créneau à venir', async () => {
    const occurrence = { id: 'o1', event_id: 'e1', date_start: '2026-11-21', date_end: null, time: '15:00:00' };
    active = spotlight({ occurrence, event: { ...event, date_start: '2026-11-07', time: '10:30:00' } as unknown as EventItem });
    await render();
    await wait(1600);
    act(() => button('Ajouter au calendrier')?.click());
    expect(downloadIcs).toHaveBeenCalledWith(expect.objectContaining({ date_start: '2026-11-21', time: '15:00:00' }));
  });

  it('« Voir la sortie » journalise, ouvre la fiche et ferme la fenêtre', async () => {
    await render();
    await wait(1600);
    act(() => button('Voir la sortie')?.click());
    expect(logSpotlight).toHaveBeenCalledWith(expect.objectContaining({ kind: 'open' }));
    expect(navigate).toHaveBeenCalledWith('/event/e1');
    expect(dialog()).toBeNull();
    expect(logSpotlight).not.toHaveBeenCalledWith(expect.objectContaining({ kind: 'dismiss' }));
  });

  it('« Plus tard » et Échap ferment et journalisent une croix', async () => {
    await render();
    await wait(1600);
    act(() => button('Plus tard')?.click());
    expect(dialog()).toBeNull();
    expect(logSpotlight).toHaveBeenCalledWith(expect.objectContaining({ kind: 'dismiss' }));

    act(() => root.unmount());
    container.remove();
    logSpotlight.mockClear();
    vi.setSystemTime(new Date(2026, 10, 19, 13, 0));
    await render();
    await wait(1600);
    expect(dialog()).not.toBeNull();
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(dialog()).toBeNull();
    expect(logSpotlight).toHaveBeenCalledWith(expect.objectContaining({ kind: 'dismiss', isLast: true }));
  });

  it('sans bouton calendrier quand l’admin l’a retiré', async () => {
    active = spotlight({ showCalendarCta: false });
    await render();
    await wait(1600);
    expect(button('Ajouter au calendrier')).toBeUndefined();
    expect(button('Voir la sortie')).toBeDefined();
  });

  it('ne fait rien sans mise en avant en cours', async () => {
    active = null;
    await render();
    await wait(5000);
    expect(dialog()).toBeNull();
  });
});
