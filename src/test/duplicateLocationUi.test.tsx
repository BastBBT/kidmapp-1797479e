// L'alerte « existe peut-être déjà » du formulaire, le motif de refus pré-rempli de l'admin et le
// dialogue de refus qui le reprend (sans e-mail, rien n'est pré-rempli : le motif ne partirait pas).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import i18n from '@/i18n';
import DuplicateLocationAlert from '@/components/DuplicateLocationAlert';
import RejectDialog from '@/components/admin/RejectDialog';
import { duplicateRejectMessage, suggestedRejectReason } from '@/lib/duplicateRejection';
import type { DuplicateMatch } from '@/lib/duplicateLocation';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;

const atlantis = { id: 'atl', name: 'You Kids Nantes Atlantis', address: 'Atlantis, Saint-Herblain', photo: null };
const strong: DuplicateMatch[] = [{ candidate: atlantis, level: 'strong', sameAddress: true }];
const weakName: DuplicateMatch[] = [{ candidate: atlantis, level: 'weak', sameAddress: false }];
const weakAddress: DuplicateMatch[] = [{ candidate: atlantis, level: 'weak', sameAddress: true }];

beforeEach(async () => {
  await i18n.changeLanguage('fr');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('DuplicateLocationAlert', () => {
  it('correspondance forte : titre, lieu, pastilles, fiche dans un nouvel onglet', () => {
    act(() => root.render(<DuplicateLocationAlert matches={strong} isActivity={false} onDismiss={() => {}} />));
    const text = container.textContent ?? '';
    expect(text).toContain('Ce lieu existe peut-être déjà');
    expect(text).toContain('You Kids Nantes Atlantis');
    expect(text).toContain('Même adresse');
    expect(text).toContain('Nom proche');
    const link = container.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('/location/atl');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('activité : le titre parle d\'activité', () => {
    act(() => root.render(<DuplicateLocationAlert matches={strong} isActivity onDismiss={() => {}} />));
    expect(container.textContent).toContain('Cette activité existe peut-être déjà');
  });

  it('correspondance faible : rappel sans pastilles, libellé selon la cause', () => {
    act(() => root.render(<DuplicateLocationAlert matches={weakName} isActivity={false} onDismiss={() => {}} />));
    expect(container.textContent).toContain('Un lieu au nom proche est déjà dans Kidmapp');
    expect(container.textContent).not.toContain('Même adresse');
    act(() => root.render(<DuplicateLocationAlert matches={weakAddress} isActivity={false} onDismiss={() => {}} />));
    expect(container.textContent).toContain('Un lieu existe déjà à cette adresse');
  });

  it('« Non, ce n\'est pas le même » appelle onDismiss', () => {
    const onDismiss = vi.fn();
    act(() => root.render(<DuplicateLocationAlert matches={strong} isActivity={false} onDismiss={onDismiss} />));
    act(() => { container.querySelector('button')!.click(); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('traduit en anglais et en espagnol', async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
    act(() => root.render(<DuplicateLocationAlert matches={strong} isActivity={false} onDismiss={() => {}} />));
    expect(container.textContent).toContain('This place may already exist');
    await act(async () => { await i18n.changeLanguage('es'); });
    act(() => root.render(<DuplicateLocationAlert matches={strong} isActivity={false} onDismiss={() => {}} />));
    expect(container.textContent).toContain('Puede que este lugar ya exista');
  });
});

describe('motif de refus d\'un doublon', () => {
  it('cite le lieu déjà en base et son lien', () => {
    const msg = duplicateRejectMessage('You Kids Atlantis', strong[0]);
    expect(msg).toContain('« You Kids Atlantis » est déjà dans Kidmapp (« You Kids Nantes Atlantis »)');
    expect(msg).toContain('https://kidmapp.app/location/atl');
    expect(msg.length).toBeLessThan(1000);
  });

  it('ne répète pas le nom quand il est identique', () => {
    expect(duplicateRejectMessage('you kids nantes atlantis', strong[0])).not.toContain('(«');
  });

  const textarea = () => container.querySelector('textarea') as HTMLTextAreaElement;
  const renderDialog = (recipientEmail: string | null) =>
    act(() =>
      root.render(
        <RejectDialog open submissionType="location" submissionName="You Kids Atlantis" recipientEmail={recipientEmail}
          initialReason="Déjà en base" onCancel={() => {}} onConfirm={() => {}} />,
      ),
    );

  it('le dialogue de refus reprend le motif pré-rempli quand on peut écrire à la personne', () => {
    renderDialog('julie@example.com');
    expect(textarea().value).toBe('Déjà en base');
  });

  it('sans e-mail, rien n\'est pré-rempli', () => {
    renderDialog(null);
    expect(textarea().value).toBe('');
  });
});

describe('motif de refus suggéré', () => {
  const sameAddressOnly: DuplicateMatch[] = [{ candidate: atlantis, level: 'weak', sameAddress: true }];

  it('pré-rempli pour une correspondance forte ou une même adresse', () => {
    expect(suggestedRejectReason('You Kids Atlantis', strong)).toContain('est déjà dans Kidmapp');
    expect(suggestedRejectReason('Pizzeria Roma', sameAddressOnly)).toContain('est déjà dans Kidmapp');
  });

  it('vide pour un nom proche à une autre adresse (autre enseigne possible) ou sans correspondance', () => {
    expect(suggestedRejectReason('You Kids Atlantis', weakName)).toBe('');
    expect(suggestedRejectReason('You Kids Atlantis', [])).toBe('');
    expect(suggestedRejectReason('You Kids Atlantis', undefined)).toBe('');
  });

  it('un nom très long garde le motif sous la limite de 1000 caractères', () => {
    const long = 'A'.repeat(900);
    const msg = suggestedRejectReason(long, [{ candidate: { ...atlantis, name: 'B'.repeat(900) }, level: 'strong', sameAddress: true }]);
    expect(msg.length).toBeLessThan(1000);
    expect(msg).toContain('…');
  });
});
