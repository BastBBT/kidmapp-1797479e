## Contexte
Ajouter un feedback visuel immédiat sur les gains de points dans la page profil (`/compte`), sans requête supplémentaire.

## Modifications

### Fichier : `src/pages/AccountPage.tsx`

1. **Badge "+10 pts" sur les contributions validées**
   - Sur les lignes `myContributions` avec `status === 'validated'`, injecter un `<span>` inline entre le nom du lieu et le badge de statut (ou juste avant celui-ci).
   - Style :
     ```
     fontSize: 11, fontWeight: 700,
     background: 'rgba(217,95,59,0.08)',
     color: '#D95F3B',
     padding: '2px 8px',
     borderRadius: 20,
     flexShrink: 0
     ```
   - Texte : `+10 pts`
   - Simplification : toujours +10 pts (le bonus first_contribution de +15 pts sera visible dans un futur historique détaillé).

2. **Badge "+25 pts" sur les propositions approuvées**
   - Sur les lignes `myProposals` avec `status === 'approved'`, même badge `+25 pts` au même emplacement relatif.

3. **Positionnement**
   - Les badges points s'affichent sur la même ligne flex que le badge de statut existant.
   - Ordre suggéré : nom du lieu → badge points → badge statut.
   - Discret : même hauteur environ que le badge statut, ne pas augmenter la hauteur de ligne.

## Ce qu'on ne fait pas
- Pas de requête BDD supplémentaire (les données `status` sont déjà chargées).
- Pas de logique conditionnelle complexe (first_contribution bonus).
- Pas de modification hors de `AccountPage.tsx`.