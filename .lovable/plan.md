

## Sécuriser l'URL d'administration

**Problème** : La route `/admin` est facilement devinable. Bien que la page soit protégée côté serveur (RLS) et côté client (vérification `isAdmin`), obscurcir l'URL ajoute une couche de sécurité supplémentaire (security through obscurity).

**Approche** : Remplacer `/admin` par une route moins prévisible, par exemple `/gestion-k1dm4p`.

### Fichiers à modifier

1. **`src/App.tsx`** — changer `path="/admin"` → `path="/gestion-k1dm4p"`
2. **`src/components/Header.tsx`** — mettre à jour les 3 références à `/admin` (navigate, pathname checks)

Optionnel : extraire le chemin dans une constante partagée pour faciliter un futur changement.

### Note

La protection réelle reste le contrôle `isAdmin` côté client et les politiques RLS côté base de données. Changer l'URL ne remplace pas ces protections mais rend la découverte de la page plus difficile pour un utilisateur non autorisé.

