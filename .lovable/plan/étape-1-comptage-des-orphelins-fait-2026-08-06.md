## Étape 1 — Comptage des orphelins (fait)

| Table | Lignes totales | Lignes avec user_id | Orphelins |
|---|---|---|---|
| `page_views` | 11 839 | 3 789 | **0** |
| `location_proposals` | 113 | 113 | **0** |

Aucun orphelin : l'Edge Function `delete-account` a bien fait son travail jusqu'ici. L'étape 2 (suppression) n'a donc rien à supprimer, mais le `DELETE` reste dans la migration par sécurité (idempotent, il tournera à vide).

Autres constats vérifiés : `pg_cron` et `pg_net` sont déjà installés, 1 job cron existe déjà (file d'emails), `account_deletions` contient 6 lignes, et aucune `page_views` n'a plus de 12 mois (le nettoyage démarrera donc à vide).

## Migration SQL (une seule, idempotente)

1. **Nettoyage préalable** — `DELETE` des lignes `page_views` et `location_proposals` dont le `user_id` ne correspond plus à un compte existant (0 ligne aujourd'hui).
2. **Clés étrangères** — sur les deux tables, `DROP CONSTRAINT IF EXISTS` puis :
   `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`
   Le droit à l'effacement devient garanti par la base, plus seulement par l'Edge Function.
3. **Fonction `public.apply_data_retention()`** — `SECURITY DEFINER`, `SET search_path = public`, `RETURNS void` :
   - supprime les `page_views` de plus de 12 mois ;
   - passe `account_deletions.email` à `NULL` au-delà de 12 mois (ligne et motif conservés comme preuve de traitement) ;
   - `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated` juste après la création — seul le rôle propriétaire (donc le cron) peut l'appeler.
4. **Planification pg_cron** — `cron.unschedule` lève une erreur si le job n'existe pas, donc la désinscription est gardée explicitement :

```text
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'apply-data-retention') THEN
    PERFORM cron.unschedule('apply-data-retention');
  END IF;
END $$;

SELECT cron.schedule(
  'apply-data-retention',
  '15 3 * * *',
  $$ SELECT public.apply_data_retention(); $$
);
```

   SQL pur, aucune clé service_role, aucun appel HTTP.

## Notes techniques

- Les FK ne touchent pas `locations` : les lieux publiés survivent à la suppression du compte proposeur, seule la proposition disparaît — comportement déjà appliqué par `delete-account`.
- La FK sur `page_views` n'affecte pas les visites anonymes (`user_id IS NULL`).
- `delete-account` reste inchangée ; ses `DELETE` explicites deviennent redondants mais restent corrects.
- Le job cron existant (file d'emails) n'est pas touché.
- Aucun changement côté React.
