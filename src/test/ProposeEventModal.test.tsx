import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import '@/i18n';
import ProposeEventModal from '@/components/ProposeEventModal';

// Appels Supabase enregistrés dans l'ordre, pour vérifier ce qui part en base.
type Call = { table: string; op: 'insert' | 'delete'; payload?: unknown; eq?: [string, unknown] };
const calls: Call[] = [];
let occurrencesError: { message: string } | null = null;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      insert: async (payload: unknown) => {
        calls.push({ table, op: 'insert', payload });
        return { error: table === 'event_occurrences' ? occurrencesError : null };
      },
      delete: () => ({
        eq: async (col: string, val: unknown) => {
          calls.push({ table, op: 'delete', eq: [col, val] });
          return { error: null };
        },
      }),
    }),
    storage: { from: () => ({ upload: vi.fn(), getPublicUrl: () => ({ data: { publicUrl: 'https://x.test/p' } }) }) },
  },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/useProposalModal', () => ({
  useProposalModal: () => ({ isOpen: true, mode: 'event', close: vi.fn(), setMode: vi.fn() }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;

const setValue = (el: HTMLInputElement, value: string) =>
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
const click = (el: Element) => act(() => { (el as HTMLElement).click(); });
const button = (text: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(text)) as HTMLButtonElement;
const dateInputs = () => [...container.querySelectorAll<HTMLInputElement>('input[type="date"]')];
const timeInputs = () => [...container.querySelectorAll<HTMLInputElement>('input[type="time"]')];

const fillBasics = () => {
  setValue(container.querySelector<HTMLInputElement>('input[placeholder^="Ex: Festival"]')!, 'Atelier Halloween');
};

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

beforeEach(() => {
  calls.length = 0;
  occurrencesError = null;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<ProposeEventModal />));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('ProposeEventModal — créneaux multiples', () => {
  it('propose un seul créneau au départ, sans bouton Retirer', () => {
    expect(dateInputs()).toHaveLength(2); // début + fin
    expect(button('Retirer ce créneau')).toBeUndefined();
    expect(button('Ajouter un autre créneau')).toBeDefined();
  });

  it('ajoute un créneau le lendemain, à la même heure, puis permet de le retirer', () => {
    setValue(dateInputs()[0], '2026-10-26');
    setValue(timeInputs()[0], '14:00');
    click(button('Ajouter un autre créneau'));

    expect(dateInputs()).toHaveLength(4);
    expect(dateInputs()[2].value).toBe('2026-10-27');
    expect(timeInputs()[1].value).toBe('14:00');
    expect(container.textContent).toContain('Créneau 2');

    click(button('Retirer ce créneau'));
    expect(dateInputs()).toHaveLength(2);
  });

  it('bloque l’envoi tant qu’aucun créneau n’est daté, puis l’autorise', () => {
    fillBasics();
    expect(button('Envoyer la proposition').disabled).toBe(true);
    setValue(dateInputs()[0], '2026-10-26');
    expect(button('Envoyer la proposition').disabled).toBe(false);
  });

  it('bloque l’envoi si la fin précède le début d’un créneau', () => {
    fillBasics();
    setValue(dateInputs()[0], '2026-10-26');
    setValue(dateInputs()[1], '2026-10-25');
    expect(container.textContent).toContain('ne peut pas précéder');
    expect(button('Envoyer la proposition').disabled).toBe(true);
  });

  it('envoie le premier créneau dans events et les suivants dans event_occurrences', async () => {
    fillBasics();
    // Saisis dans le désordre : le plus proche doit partir dans `events`.
    setValue(dateInputs()[0], '2026-10-29');
    setValue(timeInputs()[0], '10:00');
    click(button('Ajouter un autre créneau'));
    setValue(dateInputs()[2], '2026-10-27');
    setValue(timeInputs()[1], '10:00');
    click(button('Ajouter un autre créneau'));
    setValue(dateInputs()[4], '2026-10-28');
    setValue(dateInputs()[5], '2026-10-30');
    setValue(timeInputs()[2], ''); // le créneau ajouté reprenait l'heure du précédent

    click(button('Envoyer la proposition'));
    await flush();

    expect(calls.map((c) => `${c.op}:${c.table}`)).toEqual(['insert:events', 'insert:event_occurrences']);
    const event = calls[0].payload as Record<string, unknown>;
    expect(event).toMatchObject({ date_start: '2026-10-27', date_end: null, time: '10:00', status: 'pending' });
    const rows = calls[1].payload as Record<string, unknown>[];
    expect(rows).toEqual([
      { event_id: event.id, date_start: '2026-10-28', date_end: '2026-10-30', time: null },
      { event_id: event.id, date_start: '2026-10-29', date_end: null, time: '10:00' },
    ]);
  });

  it('un seul créneau : aucune écriture dans event_occurrences', async () => {
    fillBasics();
    setValue(dateInputs()[0], '2026-10-26');
    click(button('Envoyer la proposition'));
    await flush();
    expect(calls.map((c) => `${c.op}:${c.table}`)).toEqual(['insert:events']);
  });

  it('retire la proposition si les créneaux suivants échouent (pas de doublon au réessai)', async () => {
    occurrencesError = { message: 'boom' };
    fillBasics();
    setValue(dateInputs()[0], '2026-10-26');
    click(button('Ajouter un autre créneau'));
    click(button('Envoyer la proposition'));
    await flush();

    const eventId = (calls[0].payload as { id: string }).id;
    expect(calls.map((c) => `${c.op}:${c.table}`)).toEqual([
      'insert:events',
      'insert:event_occurrences',
      'delete:events',
    ]);
    expect(calls[2].eq).toEqual(['id', eventId]);
  });
});
