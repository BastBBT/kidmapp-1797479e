## Migration SQL — Système de points Kidmapp

Migration unique qui ajoute la colonne `points` au profil, la table de log `point_events`, la fonction d'attribution, et deux triggers pour récompenser contributions validées et propositions approuvées.

### 1. Colonne `points` sur `profiles`
- `points INT NOT NULL DEFAULT 0`
- Contrainte `CHECK (points >= 0 AND points <= 500)` (uniquement positif, plafonné à 500)
- La fonction `award_points` clampera l'addition à 500 pour ne jamais dépasser le plafond.

### 2. Table `point_events` (log immuable)
Colonnes métier :
- `user_id` (FK `auth.users`, cascade delete)
- `amount` (INT, `CHECK (amount > 0)`)
- `reason` (TEXT) — ex: `contribution_validated`, `first_contribution`, `proposal_approved`
- `reference_id` (TEXT, nullable) — id de l'enregistrement source

Sécurité :
- GRANT `SELECT` à `authenticated`, GRANT `ALL` à `service_role` (insertions via SECURITY DEFINER uniquement, pas de grant INSERT direct aux users).
- RLS activée.
- Policy : un utilisateur lit uniquement ses propres événements.
- **Index** sur `(user_id, created_at DESC)` pour afficher l'historique chronologique rapidement.

### 3. Fonction `award_points(p_user_id, p_amount, p_reason, p_reference_id)`
- `SECURITY DEFINER`, `search_path = public`.
- Insère dans `point_events` puis met à jour `profiles.points` avec `LEAST(points + p_amount, 500)` pour respecter le plafond.
- Si l'utilisateur est déjà à 500, l'événement est tout de même journalisé (traçabilité du gain "théorique") mais le total reste à 500.

### 4. Trigger sur `contributions` → +10 pts (+5 si premier contributeur)
- Fonction `handle_contribution_validated()` AFTER UPDATE OF status.
- Déclenchée quand `status` passe à `validated`.
- +10 pts `contribution_validated`.
- +5 pts `first_contribution` si aucune autre contribution validée n'existe pour ce `location_id`.
- Trigger nommé `on_contribution_validated_points` (distinct du `trg_contribution_validated` existant qui gère les emails).

### 5. Trigger sur `location_proposals` → +25 pts
- Fonction `handle_proposal_approved()` AFTER UPDATE OF status.
- Déclenchée quand `status` passe à `approved`.
- +25 pts `proposal_approved`.
- Trigger nommé `on_proposal_approved_points` (distinct du `trg_proposal_approved` existant).

### Notes techniques
- Les deux triggers existants (`trg_contribution_validated`, `trg_proposal_approved`) sont conservés tels quels ; les nouveaux triggers s'exécutent en parallèle.
- Aucune modification du code frontend dans cette étape — UI à venir.
- Les types TypeScript Supabase seront régénérés automatiquement après application.