// Le filtre « Doublons possibles » de l'onglet Propositions : son bouton n'est affiché que quand il
// reste au moins une proposition signalée. Il doit donc se couper tout seul dès qu'il n'y en a plus,
// sinon la liste reste vide sans aucun bouton pour le rouvrir.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useDuplicatesFilter } from '@/hooks/useDuplicatesFilter';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;

/** Le « compteur » transmis au hook est le nombre de propositions encore signalées en attente. */
function Harness({ count }: { count: number }) {
  const { duplicatesOnly, toggleDuplicatesOnly } = useDuplicatesFilter(count);
  return (
    <button onClick={toggleDuplicatesOnly} aria-pressed={duplicatesOnly}>
      {duplicatesOnly ? 'filtre-actif' : 'filtre-inactif'} · {count}
    </button>
  );
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const state = () => (container.textContent ?? '').split(' · ')[0];
const click = () => act(() => container.querySelector('button')!.click());

describe('useDuplicatesFilter', () => {
  it("reste actif tant qu'il reste des propositions signalées", () => {
    act(() => root.render(<Harness count={3} />));
    expect(state()).toBe('filtre-inactif');

    click();
    expect(state()).toBe('filtre-actif');

    // Une proposition signalée traitée sur trois : le filtre doit rester actif.
    act(() => root.render(<Harness count={2} />));
    expect(state()).toBe('filtre-actif');
  });

  it('se coupe quand la dernière proposition signalée est traitée', () => {
    act(() => root.render(<Harness count={1} />));
    click();
    expect(state()).toBe('filtre-actif');

    // La dernière est publiée ou refusée : le compteur tombe à 0, le bouton se retire avec lui.
    act(() => root.render(<Harness count={0} />));
    expect(state()).toBe('filtre-inactif');
  });
});
