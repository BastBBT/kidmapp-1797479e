// Alerte « existe peut-être déjà » dans le formulaire de proposition : le clic sur « Continuer » arrive
// avant que le blur du champ adresse ait été rendu. L'alerte doit quand même être lue une fois, sans
// jamais bloquer : le clic suivant, ou « Non, ce n'est pas le même », laisse continuer.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import i18n from '@/i18n';
import ProposeLocationModal from '@/components/ProposeLocationModal';
import type { DuplicateCandidate } from '@/lib/duplicateLocation';

const atlantis: DuplicateCandidate = { id: 'atl', name: 'You Kids Nantes Atlantis', address: 'Atlantis, Saint-Herblain', photo: null };
let published: DuplicateCandidate[] = [atlantis];

vi.mock('@/hooks/useDuplicateCandidates', () => ({ useDuplicateCandidates: () => ({ data: published }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/useMeals', () => ({ useMealTypes: () => ({ data: [] }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({}), storage: { from: () => ({}) } },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;

const render = () => act(() => root.render(<ProposeLocationModal open onClose={() => {}} />));
const setValue = (el: HTMLInputElement, value: string) =>
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
const nameInput = () => container.querySelector<HTMLInputElement>('input[placeholder^="Ex: Le Petit"]');
const addressInput = () => container.querySelector<HTMLInputElement>('input[placeholder^="Ex: 6 rue"]')!;
const button = (text: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(text)) as HTMLButtonElement;
const click = (el: Element) => act(() => { (el as HTMLElement).click(); });
const fillAtlantis = () => {
  setValue(nameInput()!, 'You Kids Atlantis');
  setValue(addressInput(), 'Centre Atlantis, Saint-Herblain');
};
const alertShown = () => (container.textContent ?? '').includes('Ce lieu existe peut-être déjà');

beforeEach(async () => {
  await i18n.changeLanguage('fr');
  published = [atlantis];
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  render();
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('ProposeLocationModal : alerte doublon', () => {
  it('« Continuer » juste après la saisie, sans blur : reste sur l\'étape et montre l\'alerte', () => {
    fillAtlantis();
    expect(alertShown()).toBe(false);
    click(button('Continuer'));
    expect(alertShown()).toBe(true);
    expect(nameInput()).not.toBeNull();
  });

  it('un second « Continuer » passe à l\'étape suivante : l\'alerte ne bloque jamais', () => {
    fillAtlantis();
    click(button('Continuer'));
    click(button('Continuer'));
    expect(nameInput()).toBeNull();
  });

  it('« Non, ce n\'est pas le même » écarte l\'alerte et « Continuer » passe aussitôt', () => {
    fillAtlantis();
    click(button('Continuer'));
    click(button('Non, ce n\'est pas le même'));
    expect(alertShown()).toBe(false);
    click(button('Continuer'));
    expect(nameInput()).toBeNull();
  });

  it('un lieu sans rapport ne retient pas l\'utilisateur', () => {
    setValue(nameInput()!, 'Zoo de Pont-Scorff');
    setValue(addressInput(), 'Pont-Scorff');
    click(button('Continuer'));
    expect(nameInput()).toBeNull();
  });

  it('la liste des lieux arrive après la saisie : l\'alerte apparaît quand même', () => {
    published = [];
    render();
    fillAtlantis();
    act(() => { nameInput()!.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); });
    expect(alertShown()).toBe(false);
    published = [atlantis];
    render();
    expect(alertShown()).toBe(true);
  });
});
