# Localisation FR/EN/ES + langue auto sur les commentaires

## Objectif

Rendre l'app web Kidmapp disponible en FR, EN et ES avec détection automatique de la langue navigateur, tout en gardant les tokens français stables en base. Ajouter un badge de langue détectée sur les commentaires communautaires non-francophones.

---

## 1. Infrastructure i18n

**Librairie** : `react-i18next` + `i18next-browser-languagedetector`.

**Détection langue** :
- Auto via `navigator.language` au boot (aucun sélecteur UI).
- Mapping : `fr*` → `fr`, `en*` → `en`, `es*` → `es`. Fallback : `fr`.
- Persistance dans `localStorage` (`kidmapp-lang`) pour éviter les flashs si l'utilisateur change de navigateur.

**Fichiers de traduction** : `src/i18n/locales/{fr,en,es}.json`, organisés par namespaces logiques (`common`, `nav`, `filters`, `location`, `event`, `contribution`, `account`).

**Init** : `src/i18n/index.ts` importé dans `main.tsx` avant le render.

---

## 2. Traduction des tokens FR issus de pickers fermés

Créer `src/i18n/tokenMaps.ts` avec un helper unique :

```ts
translateToken(namespace, token, t) → t(`tokens.${namespace}.${token}`, { defaultValue: token })
```

Le `defaultValue: token` garantit le repli sur le texte brut si un nouveau token apparaît en base sans être mappé.

Namespaces couverts (tokens **exacts** conservés en base) :
- **Catégories lieux** (10 valeurs réelles alignées iOS) : `restaurant`, `cafe`, `shop`, `public`, `coiffeur`, `nature`, `sport`, `creatif`, `culture`, `jeux`
- **Catégories events** : `Spectacle`, `Atelier`, `Festival`, `Fête`, `Marché`, `Exposition`, `Autre`
- **Prix** : `Gratuit`, `Payant`
- **Météo lieu** : `Soleil`, `Pluie`, `Tout temps`
- **Météo event** : `En intérieur`, `En extérieur`, `Les deux`
- **Durée** : `1h`, `2-3h`, `Demi-journée`, `Journée`
- **Effort** : `Tranquille`, `Modéré`, `Sportif`
- **Repas** : `Petit déjeuner`, `Brunch`, `Déjeuner`, `Goûter`, `Dîner`
- **Bookable** : `yes` / `no` / `unknown`
- **Équipements** : `high_chair`, `changing_table`, `kids_area`, `kids_menu`

Refactorer les composants d'affichage pour passer par `translateToken` (jamais côté formulaire d'insertion — les valeurs envoyées à la DB restent les tokens FR).

Composants concernés (affichage) : `LocationCard`, `LocationPage`, `EventCard`, `EventPage`, `MapView` (popups), `SavedPage`, `AccountPage` (listes contributions), `LocationServicesSection`, `LocationContributionsSection`, filtres (labels visuels uniquement).

---

## 3. UI shell traduite

Chaînes traduites (tokens stables, contenu libre jamais touché) :
- **BottomNav** : Explorer / Sorties / Proposer / Favoris / Compte → EN : Explore / **Events** / Add / Saved / Account · ES : Explorar / **Eventos** / Añadir / Guardados / Cuenta.
- **Header, Onboarding, AuthModal, IosAppBanner, AcquisitionModal, ContributionModal, ProposeLocationModal, ProposeEventModal, ContributeSheet, DeleteAccountSection, WeekendPicker, tous les filtres, LevelCard, ShareLevelCard/Modal, EventFeedbackCard, pages (Index, SortiesPage, SavedPage, AccountPage, LocationPage, EventPage, PrivacyPage, SupportPage, NotFound)**.
- Terminologie : préférer **"Equipment"** à "Amenities" pour tout ce qui concerne chaise haute / table à langer / etc.
- **Admin non traduit** (interne, gain faible) — hors scope.

Toasts, boutons, labels, placeholders, aria-labels : tous passés via `useTranslation()`.

---

## 4. Dates events selon la langue active

Remplacer les `toLocaleDateString('fr-FR', ...)` et strings figées par un helper `formatEventDate(date, lang, opts)` qui utilise la locale active. Impacté : `EventCard`, `EventPage`, `WeekendPicker`, `SortiesPage` (labels "Semaine du…").

Adapter aussi `formatRelativeDateFr` → `formatRelativeDate(date, lang)` avec chaînes traduites ("Hier" / "Yesterday" / "Ayer", "Il y a X jours" / "X days ago" / "Hace X días"…).

---

## 5. Détection langue commentaire (contributions)

**Lib** : `franc-min` (léger, ~10Ko).

**Flow à la soumission** dans `ContributionModal` :
1. Si l'utilisateur a saisi un commentaire libre (`content`), passer par `franc(content, { minLength: 10 })`.
2. Mapper le code ISO 639-3 retourné vers `fr` / `en` / `es` / autres codes 2-lettres via une petite table (`fra`→`fr`, `eng`→`en`, `spa`→`es`, `deu`→`de`, `ita`→`it`, `por`→`pt`).
3. Insérer `language: <code2>` avec le reste du payload. Si texte < 10 chars ou détection `und` → laisser `null` (non bloquant).

Aucun changement de schéma (colonne déjà présente, partagée iOS/web).

**Affichage badge** dans `LocationContributionsSection` :
- À côté du prénom + date, afficher un petit badge `EN` / `ES` / `DE` etc. **uniquement si `language` est défini ET ≠ `fr`**.
- Style : pilule discrète, `font-size: 10px`, `padding: 2px 6px`, `background: var(--bg)`, `color: var(--text-muted)`, `border-radius: 100px`, `font-weight: 700`, `letter-spacing: 0.5px`.
- Pas de traduction du commentaire, juste l'indicateur.

---

## 6. Scope out

- **Admin** (`/gestion-k1dm4p`) : reste en FR (usage interne).
- **Contenu libre** : noms, descriptions, adresses, commentaires — jamais traduits (voulu).
- **Emails transactionnels** : restent en FR.
- **Sélecteur de langue manuel** : non ajouté (auto seulement).
- **Détection langue rétroactive** sur les commentaires existants : hors scope.

---

## Détails techniques

**Nouveaux fichiers** :
- `src/i18n/index.ts` — init react-i18next
- `src/i18n/locales/fr.json`, `en.json`, `es.json`
- `src/i18n/tokenMaps.ts` — helper `translateToken`
- `src/lib/detectLanguage.ts` — wrapper `franc-min` + mapping ISO
- `src/lib/formatDate.ts` — helpers `formatEventDate`, `formatRelativeDate` localisés

**Dépendances** : `react-i18next`, `i18next`, `i18next-browser-languagedetector`, `franc-min`.

**Base de données** : aucune migration. Les tokens FR envoyés aux `INSERT`/`UPDATE` restent inchangés.
