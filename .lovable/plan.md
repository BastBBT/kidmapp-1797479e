# Clé service_role : diagnostic et suite

## Étape 0 — Résultats du diagnostic (lecture seule, déjà exécuté)

a) Réglage en clair : **absent**
- `current_setting('app.service_role_key', true)` → NULL
- `pg_db_role_setting` : 0 ligne contenant `app.service_role_key`

b) Jobs pg_cron (2, tous actifs) :

```text
apply-data-retention   15 3 * * *   utilise_le_reglage = false
weekly-admin-report    0 5 * * 1    utilise_le_reglage = false
```

`weekly-admin-report` existe toujours et lit déjà la clé dans Vault :
`'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')`.
`apply-data-retention` est du SQL pur, sans clé.

c) Vault : un seul secret, `email_queue_service_role_key`, mis à jour le 2026-08-01.

Conclusion : **l'étape 3 (retirer le réglage en clair) est déjà sans objet**, et aucun
job à réécrire. Le pattern Vault est en place partout. Reste uniquement la rotation de
la clé, puisqu'elle a pu être exposée par le passé.

## Ce que je propose de faire

1. Faire tourner la clé service_role via la rotation des clés d'API du backend
   (pas de dashboard Supabase accessible ici : la rotation passe par l'outil de
   rotation intégré, qui régénère la clé et met à jour automatiquement la variable
   `SUPABASE_SERVICE_ROLE_KEY` des edge functions).
2. Immédiatement après, mettre à jour le secret Vault avec la nouvelle valeur :
   `vault.update_secret((SELECT id FROM vault.secrets WHERE name = 'email_queue_service_role_key'), '<nouvelle clé>')`.
3. Vérifier la reprise : `cron.job_run_details` pour `process-email-queue` (planifié à
   la demande) et `weekly-admin-report`, plus les logs de la fonction
   `process-email-queue` (pas de 401/403).
4. Ne rien changer côté React.

## Point à valider avant de lancer

Entre 1 et 2, la file d'emails présente une clé périmée : rien n'est perdu (les
messages restent en pgmq) mais rien ne part pendant quelques minutes. Les autres
fonctions serveur utilisant la clé (rapport hebdo, suppression de compte,
notifications) échouent aussi durant cette fenêtre.

Question : confirmes-tu la rotation maintenant, ou préfères-tu la programmer à un
moment creux ? Si le seul objectif était de sortir la clé de la configuration en
clair, il n'y a rien à faire — c'est déjà le cas.
