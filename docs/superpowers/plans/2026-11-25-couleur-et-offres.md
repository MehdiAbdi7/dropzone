# Couleur et offres Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dans la visionneuse de couleurs, un clic sur « Voir les offres » remplace la partie droite par le choix de stockage / la liste d'occasions et le bouton panier, sans changer de page ; « Changer de couleur » revient à l'affichage d'avant.

**Architecture:** `ColorViewer` (client) garde le téléphone à gauche et reçoit un état `offers: JourneyCondition | null`. La logique pure (variantes à montrer, état de départ, adresse) va dans `colorViewerRules.ts`, testée. Un nouveau composant `ViewerOffers.tsx` affiche `NewPicker` ou `RefurbishedList` ; les trois pages (`/couleurs`, `/neuf`, `/occasion`) passent les paramètres d'adresse au composant.

**Tech Stack:** Next.js (App Router, Turbopack), React, TypeScript, vitest, CSS dans `@layer components`.

**Spec:** `docs/superpowers/specs/2026-11-25-couleur-et-offres-design.md`

## Global Constraints

Tout vit dans `client/` de `C:\Users\mehdi\Documents\DEV-WEB\mes-projets\dropzone-complet`.

- Commentaires et textes en français, sans tirets longs (em dashes). Commentaires qui expliquent le pourquoi, datés `(25/11, demande de Mehdi)` comme dans le reste du code : Mehdi relit le code sans l'écrire.
- Commits : jamais de `Co-Authored-By`, jamais de mention de Claude (dépôt public lu par des recruteurs).
- Ne pas toucher à l'API ni à `server/` ; ne jamais lire `server/.env`.
- Panier, API, règles de stock : inchangés. Les modèles sans couleurs et les accessoires gardent `ProductHeader`.
- Branche : la branche courante est fusionnée et périmée. `git fetch origin` puis `git checkout -b feat/couleur-et-offres origin/main`. `AGENTS.md` (client) n'est pas à commiter.
- Étape de la frise : « Couleur et offres ».

## Review Focus

- `?couleur=` inconnue, ou donnée deux fois (tableau) : retombe sur le mode couleurs (Task 2).
- `?couleur=` valide mais sans stock dans l'état : mode couleurs, pas d'écran vide (Task 2).
- Page de référence rechargée en mode offres : revient aux mêmes offres grâce à `etat` (Task 2).
- Clavier et glissement en mode offres : ne doivent pas changer la couleur sous les offres (Task 3, vérifié au navigateur).
- Retour à « Changer de couleur » : le focus ne se perd pas (Task 3, vérifié au navigateur).

---

### Task 1: Renommer l'étape en « Couleur et offres »

**Files:**
- Modify: `client/src/features/shop/journey.ts:44` (`LABELS.color`) et `:53` (`TITLES.color`)
- Test: `client/src/features/shop/journey.test.ts:30` et `:131`

**Interfaces:**
- Produces: aucune signature ne change.

- [ ] **Step 1: Mettre à jour les deux tests** : à la ligne 30, le dernier libellé attendu devient `"Couleur et offres"` ; à la ligne 131, `journeyTitle("color")` attend `"Choisis la couleur et l'offre"`.
- [ ] **Step 2: Run** `npx vitest run src/features/shop/journey.test.ts` (depuis `client/`). Expected: FAIL sur ces deux assertions.
- [ ] **Step 3: Implement** : `LABELS.color = "Couleur et offres"`, `TITLES.color = "Choisis la couleur et l'offre"`.
- [ ] **Step 4: Run** la même commande. Expected: PASS.
- [ ] **Step 5: Commit** `journey.ts`, `journey.test.ts` et les deux documents de `docs/superpowers` : `feat: l'étape Couleur s'appelle Couleur et offres`.

### Task 2: Règles pures du mode offres

**Files:**
- Modify: `client/src/features/shop/colorViewerRules.ts` (ajouter à la fin ; importer `ofColor` est déjà fait)
- Test: `client/src/features/shop/colorViewerRules.test.ts`

**Interfaces:**
- Consumes: `viewerColors`, `firstIndex`, `ViewerColor`, `JourneyCondition`, `ofColor` (déjà dans le fichier).
- Produces:
  - `offerVariants(product: ProductDetail, colorName: string, condition: JourneyCondition): Variant[]` : les variantes de cette couleur et de cet état avec `stock > 0`.
  - `type ViewerParams = { preview?: string | string[]; couleur?: string | string[]; etat?: string | string[] }`
  - `startView(product: ProductDetail, colors: ViewerColor[], condition: JourneyCondition | null, params: ViewerParams): { index: number; offers: JourneyCondition | null }`
  - `viewerSearch(current: string, colorName: string, offers: JourneyCondition | null, condition: JourneyCondition | null): string` : renvoie la chaîne de requête sans `?`.

- [ ] **Step 1: Write the failing tests.** Dans le fichier de test, ajouter la fixture `shop` (`slug: "p30"`, couleurs `Noir` et `Argent` sans photo ; variantes `variant("new","Noir",2,345000)`, `variant("new","Argent",0,345000)`, `variant("refurbished","Argent",1,250000)`), `shopColors = viewerColors(shop)`, puis ces tests, nommés en français comme les autres :
  - `offerVariants`: Noir + `"new"` donne 1 variante à 345000 ; Argent + `"new"` donne `[]` (stock 0) ; Noir + `"refurbished"` donne `[]` ; Argent + `"refurbished"` donne 1 variante à 250000.
  - `startView` : `couleur: "Noir"` avec condition `"new"` donne `{ index: 0, offers: "new" }` ; `couleur: "Argent"` avec `"new"` et `preview: "Argent"` donne `{ index: 1, offers: null }` ; `couleur: "Inconnue"` donne `{ index: 0, offers: null }` ; `couleur: ["Noir", "x"]` utilise le premier ; condition `null`, `etat: "occasion"`, `couleur: "Argent"` donne `{ index: 1, offers: "refurbished" }` ; condition `null` sans `etat` donne `offers: null` ; condition `"new"` l'emporte sur `etat: "occasion"`.
  - `viewerSearch` : `("apercu=Noir","Noir","new","new")` donne `"couleur=Noir"` ; `("couleur=Noir","Noir",null,"new")` donne `"apercu=Noir"` ; `("apercu=Argent","Argent","refurbished",null)` donne `"couleur=Argent&etat=occasion"` ; `("couleur=Argent&etat=occasion","Argent",null,null)` donne `"apercu=Argent"` ; `("utm=1&apercu=Noir","Noir","new","new")` donne `"utm=1&couleur=Noir"` ; `("","Bleu ciel","new","new")` donne `"couleur=Bleu+ciel"`.
- [ ] **Step 2: Run** `npx vitest run src/features/shop/colorViewerRules.test.ts`. Expected: FAIL (fonctions absentes).
- [ ] **Step 3: Implement** les trois fonctions dans `colorViewerRules.ts`. `startView` : l'état montré est `condition`, sinon celui de `etat` (`"neuf"` donne `"new"`, `"occasion"` donne `"refurbished"`) ; si `couleur` (premier élément s'il s'agit d'un tableau) est une couleur du modèle et que `offerVariants` n'est pas vide pour l'état montré, renvoyer cet indice et l'état ; sinon `{ index: firstIndex(colors, condition, params.preview), offers: null }`. `viewerSearch` : `URLSearchParams`, en mode offres supprimer `apercu`, mettre `couleur`, et mettre `etat` (`neuf` / `occasion`) seulement si `condition` est `null` (sinon le supprimer) ; en mode couleurs supprimer `couleur` et `etat` et mettre `apercu`. Ajouter l'import de `Variant` depuis `@/types/api`.
- [ ] **Step 4: Run** la même commande. Expected: PASS, y compris les anciens tests.
- [ ] **Step 5: Commit** : `feat: règles du mode offres de la visionneuse`.

### Task 3: Le mode offres dans la visionneuse

**Files:**
- Create: `client/src/features/shop/ViewerOffers.tsx`
- Modify: `client/src/features/shop/ColorViewer.tsx`
- Modify: `client/src/styles/color-viewer.css`

**Interfaces:**
- Consumes: `startView`, `viewerSearch`, `offerVariants`, `ViewerParams` (Task 2) ; `NewPicker` (props `variants`, `kind`, `palette`, `colorChosen`) ; `RefurbishedList` (props `variants`, `kind`, `palette`).
- Produces:
  - `ViewerOffers({ product, colorName, condition, palette, onBack }: { product: ProductDetail; colorName: string; condition: JourneyCondition; palette: Palette; onBack: () => void })` : client component ; `NewPicker` avec `colorChosen` pour `"new"`, `RefurbishedList` pour `"refurbished"`, variantes de `offerVariants`.
  - `ColorViewer` : la prop `preview` est remplacée par `params: ViewerParams`.

- [ ] **Step 1: Create `ViewerOffers.tsx`** (`"use client"`, signature ci-dessus). Le bouton « Changer de couleur » est un `button` de classe `viewer-back`, placé au-dessus du contenu. Le contenu du picker est encadré par un `div` de classe `viewer-offers`.
- [ ] **Step 2: Modify `ColorViewer.tsx`.**
  - Remplacer `preview` par `params` ; l'état de départ vient de `startView(product, colors, condition, params)` (index et `offers`) ; ajouter `const [offers, setOffers] = useState<JourneyCondition | null>(...)`.
  - Dans `show()`, remplacer la construction de l'adresse par `viewerSearch(window.location.search.slice(1), colors[target].name, null, condition)` (même `replaceState`).
  - Fonctions `openOffers(one: JourneyCondition)` : `setOffers(one)` et `replaceState` avec `viewerSearch(..., one, condition)` ; `closeOffers()` : `setOffers(null)`, `replaceState` avec `viewerSearch(..., null, condition)`, puis focus sur la pastille de la couleur (`dotRefs.current[index]`).
  - Les liens `viewer-cta` (les deux cas, état connu et deux états) deviennent des `button type="button"` de même classe qui appellent `openOffers(...)` avec l'état de la ligne ; `line.href` ne sert plus qu'à savoir si la ligne est disponible (`line.available`).
  - En mode offres : `go()` ne fait rien (guard au début), `onFrameKey` n'agit pas, le début de glissement n'est pas enregistré, les flèches et le compteur ne s'affichent pas, et `viewer-info` montre `ViewerOffers` à la place des pastilles et de la disponibilité (avec `key={`${color.name}-${offers}`}` pour remettre le picker à zéro).
- [ ] **Step 3: CSS dans `color-viewer.css`** : style de `.viewer-back` (bouton discret, même famille que `.viewer-hint button` : sans fond, `#aeb6ff`, gras, 44 px de haut) ; `.viewer-offers` avec un espace en haut ; fondu d'entrée du contenu de droite avec la même durée que `.viewer-layer` (0.26 s), désactivé sous `prefers-reduced-motion`.
- [ ] **Step 4: Relire** `ColorViewer.tsx` et `ViewerOffers.tsx` pour les imports et les types. Pas de `tsc` ici : les pages passent encore `preview`, la vérification de types se fait à la fin de la Task 4.
- [ ] **Step 5: Commit** : `feat: les offres s'affichent dans la visionneuse sans changer de page`.

### Task 4: Brancher les trois pages, puis vérifier

**Files:**
- Modify: `client/src/features/shop/ColorStep.tsx` (prop `preview` remplacée par `params: ViewerParams`)
- Modify: `client/src/app/(shop)/produits/[slug]/couleurs/page.tsx`
- Modify: `client/src/app/(shop)/produits/[slug]/neuf/page.tsx`
- Modify: `client/src/app/(shop)/produits/[slug]/occasion/page.tsx`

**Interfaces:**
- Consumes: `ColorViewer` avec `params` (Task 3).

- [ ] **Step 1: `couleurs/page.tsx`** : passer `params={{ preview: search.apercu, couleur: search.couleur, etat: search.etat }}` (lire `await searchParams` une seule fois).
- [ ] **Step 2: `neuf/page.tsx` et `occasion/page.tsx`** : les redirections sans stock restent telles quelles. Quand `step.color !== null` (modèle à couleurs, couleur valide), rendre `ColorStep` avec `params={{ preview: search.apercu, couleur: search.couleur }}` au lieu de `ProductHeader`. Le cas `step.color === null` (modèle sans couleurs) garde `ProductHeader` inchangé.
- [ ] **Step 3: `ColorStep.tsx`** : transmettre `params` à `ColorViewer`.
- [ ] **Step 4: Run** `npx tsc --noEmit`, `npm run lint` et `npx vitest run` depuis `client/`. Expected: aucune erreur, tous les tests passent. Nettoyer les imports devenus inutiles dans `neuf/page.tsx` et `occasion/page.tsx` seulement s'ils ne servent plus (le cas sans couleurs les utilise encore).
- [ ] **Step 5: Vérifier au navigateur.** `preview_start` avec `dzc-web-api-en-ligne` (API en ligne, lecture seule) ; si une règle de `color-viewer.css` manque, supprimer `client/.next/dev` et relancer. Vérifier `tabs_context` : panneau visible pour les captures. Sur `/produits/iphone-18-pro/neuf?couleur=Noir` à 1365 px puis 375 px : (a) le téléphone reste à gauche et les offres (stockage, prix, Ajouter au panier) sont à droite, lisibles sur fond sombre ; si les puces ou la carte (`chip`, `card`) sont illisibles, ajouter les règles de contraste sous `.viewer` dans `color-viewer.css` ; (b) « Changer de couleur » ramène les pastilles, le focus est sur la pastille de la couleur et l'adresse repasse à `?apercu=Noir` ; (c) en mode offres, les flèches du clavier et le glissement ne changent pas la couleur ; (d) sur `/produits/iphone-18-pro/couleurs`, une ligne Neuf puis Occasion ouvre les offres de son état, l'adresse porte `couleur` et `etat`, et un rechargement revient aux mêmes offres ; (e) `/produits/iphone-18-pro/neuf?couleur=Inconnue` et une couleur sans stock affichent le mode couleurs ou redirigent, sans page vide ; (f) ajouter au panier depuis le mode offres met bien l'article dans le panier.
- [ ] **Step 6: Commit** : `feat: pages couleurs, neuf et occasion sur la visionneuse à deux modes`. Pousser sur `feat/couleur-et-offres` seulement après `git fetch origin` et contrôle de `main`.
