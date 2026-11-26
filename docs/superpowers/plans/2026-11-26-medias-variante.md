# Photos et vidéo d'une variante Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter des photos et une vidéo à une variante précise depuis le back-office, les montrer sous la photo du téléphone, arriver dessus depuis une story, et les supprimer (base et Cloudinary) dès que le stock tombe à 0.

**Architecture:** Une table `variant_media` liée à la variante. Un service de suppression unique (`purgeSoldMedia`) déclenché après toute écriture réussie de l'API (comme `releaseReservationsMiddleware` pour les réservations), plus un balayage horaire de sécurité. Côté boutique, la visionneuse de couleurs garde la variante montrée et affiche une rangée de miniatures sous le téléphone.

**Tech Stack:** Express 5, Prisma 7, PostgreSQL, multer, Cloudinary, Vitest et Supertest ; Next.js 16, React, RTK Query, Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-26-medias-variante-design.md`

## Global Constraints

- Migration additive seulement, écrite à la main (`20261126100000_variant_media`) ; jamais lancée sur Neon depuis le PC (garde-fou de `prisma.config.ts`) : tests sur base jetable.
- Plafonds : 8 photos et 1 vidéo par variante ; photo 5 Mo, vidéo 50 Mo.
- Envoi refusé (409) sur une variante dont le stock est 0.
- Vidéo compressée une seule fois à l'envoi : largeur 720 px au plus, qualité automatique, format mp4. Aucune transformation à la lecture.
- Routes d'envoi dans `productAdminRouter` (admin seulement, route absente de la table des droits).
- Une erreur Cloudinary à la suppression est journalisée et ne bloque jamais une vente.
- La photo de couleur existante (`model_color_photos`, `ColorViewer`) ne change pas.
- Tests d'abord. Commits sans mention de Claude. API déployée avant le front.

## Review Focus

- Envoi sur une variante à stock 0 : refusé (409), rien n'est envoyé à Cloudinary. Test dans la tâche 3.
- Vidéo de plus de 50 Mo ou fichier d'un autre format : refus propre (4xx), pas d'erreur 500. Tâche 3.
- Échec de Cloudinary à la suppression après une vente : la vente aboutit, les lignes sont quand même supprimées. Tâche 4.
- Variante retirée du formulaire produit, ou produit supprimé : leurs fichiers Cloudinary sont supprimés (la cascade de la base ne prévient pas Cloudinary). Tâche 4.
- Adresse `?variante=` avec un SKU inconnu, en rupture ou en brouillon : ignorée, comportement actuel. Tâche 7.

---

### Task 1: Table `variant_media` et envoi vidéo Cloudinary

**Files:**
- Modify: `server/prisma/schema.prisma` (enum `MediaKind`, modèle `VariantMedia`, relation `media VariantMedia[]` sur `ProductVariant`)
- Create: `server/prisma/migrations/20261126100000_variant_media/migration.sql`
- Modify: `server/src/config/cloudinary.ts`
- Test: `server/tests/variantMediaSchema.test.ts`

**Interfaces:**
- Produces: `prisma.variantMedia` (`id`, `variantId`, `kind: "photo" | "video"`, `url`, `publicId`, `position`, `createdAt`) ; `uploadToCloudinary(buffer, folder?)` inchangé ; `uploadVideoToCloudinary(buffer: Buffer): Promise<{ url: string; publicId: string }>` ; `deleteFromCloudinary(publicId: string | null, kind?: "photo" | "video"): Promise<void>` (`kind` vaut `photo` par défaut).

- [ ] **Step 1: Write the failing test** `variantMediaSchema.test.ts` : « supprimer une variante supprime ses médias en base » (créer une variante et deux lignes `variantMedia`, supprimer la variante, `count` des médias = 0) ; « deux médias d'une variante gardent leur ordre par `position` ».
- [ ] **Step 2: Run** `npx vitest run tests/variantMediaSchema.test.ts` (dans `server/`). Expected: FAIL (modèle absent).
- [ ] **Step 3: Écrire le modèle et la migration à la main** : table `variant_media`, `kind` en enum PostgreSQL `MediaKind`, clé étrangère `ON DELETE CASCADE`, index sur `variant_id`. Régénérer le client Prisma.
- [ ] **Step 4: Dans `cloudinary.ts`**, ajouter `uploadVideoToCloudinary` (`upload_stream` avec `resource_type: "video"`, dossier `dropzone/variants`, `format: "mp4"`, transformation entrante `[{ width: 720, crop: "limit", quality: "auto" }]`) et le paramètre `kind` de `deleteFromCloudinary` (`resource_type: "video"` pour une vidéo).
- [ ] **Step 5: Run** le test, puis `npx tsc --noEmit`. Expected: PASS, aucune erreur de type.
- [ ] **Step 6: Commit** `feat: table variant_media et envoi video Cloudinary`.

### Task 2: Règles pures des médias

**Files:**
- Create: `server/src/modules/products/variantMedia.rules.ts`
- Test: `server/tests/variantMediaRules.test.ts`

**Interfaces:**
- Produces: `MAX_PHOTOS = 8`, `MAX_VIDEOS = 1`, `PHOTO_MAX_BYTES = 5 * 1024 * 1024`, `VIDEO_MAX_BYTES = 50 * 1024 * 1024` ; `mediaKindOf(mimetype: string): "photo" | "video" | null` ; `posterOf(videoUrl: string): string` (remplace l'extension finale par `.jpg`) ; `checkMediaRoom(input: { stock: number; kind: "photo" | "video"; photos: number; videos: number; size: number }): { ok: true } | { ok: false; status: number; message: string }`.

- [ ] **Step 1: Write the failing tests** : `mediaKindOf("image/webp")` = `"photo"`, `"video/mp4"` = `"video"`, `"application/pdf"` = `null` ; `posterOf("https://res.cloudinary.com/x/video/upload/v1/dropzone/variants/a.mp4")` = même adresse en `.jpg` ; `checkMediaRoom` : stock 0 → `{ ok: false, status: 409 }` ; 8 photos et une 9e → 409 ; une 2e vidéo → 409 ; vidéo de `VIDEO_MAX_BYTES + 1` → 413 ; photo de `PHOTO_MAX_BYTES + 1` → 413 ; cas normal → `{ ok: true }`.
- [ ] **Step 2: Run** `npx vitest run tests/variantMediaRules.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implémenter** les quatre éléments ci-dessus, sans accès à la base.
- [ ] **Step 4: Run** le test. Expected: PASS.
- [ ] **Step 5: Commit** `feat: regles des medias d'une variante`.

### Task 3: Routes d'administration des médias

**Files:**
- Modify: `server/src/middlewares/upload.ts` (ajouter `uploadMedia`, champ `media`, 50 Mo, JPEG, PNG, WebP, `video/mp4`, `video/quicktime`, `video/webm`)
- Create: `server/src/modules/products/variantMedia.service.ts`
- Modify: `server/src/modules/products/productAdmin.routes.ts`, `productAdmin.controller.ts`, `product.schema.ts` (`mediaParamsSchema = idParamsSchema.extend({ mediaId })`, `mediaOrderBodySchema = z.object({ ids: z.array(z.number().int().positive()).max(9) })`)
- Test: `server/tests/variantMedia.admin.test.ts`

**Interfaces:**
- Consumes: Task 1 (`uploadVideoToCloudinary`, `deleteFromCloudinary(id, kind)`), Task 2 (`checkMediaRoom`, `mediaKindOf`).
- Produces: `POST /admin/variants/:id/media` (champ `media`, rend 201 `{ data: { id, kind, url, posterUrl, position } }`) ; `DELETE /admin/variants/:id/media/:mediaId` (204) ; `PUT /admin/variants/:id/media/order` (corps `{ ids }`, rend 200) ; `addVariantMedia(variantId: number, file: Express.Multer.File | undefined)`, `removeVariantMedia(variantId: number, mediaId: number)`, `reorderVariantMedia(variantId: number, ids: number[])`.

- [ ] **Step 1: Write the failing tests** (Cloudinary simulé comme dans `productMainImage.test.ts`) : « une photo est ajoutée en dernière position » ; « une vidéo mp4 est ajoutée avec `posterUrl` en `.jpg` » ; « une variante à stock 0 refuse l'envoi (409) et n'appelle pas Cloudinary » ; « une 9e photo est refusée (409) » ; « une 2e vidéo est refusée (409) » ; « un PDF est refusé (400) » ; « un fichier au-dessus de la limite est refusé (413, pas 500) » ; « supprimer un média le retire de la base et appelle `deleteFromCloudinary(publicId, kind)` » ; « réordonner change les `position` et refuse un identifiant d'une autre variante » ; « un vendeur reçoit 403 ».
- [ ] **Step 2: Run** `npx vitest run tests/variantMedia.admin.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implémenter** le middleware `uploadMedia` (même forme que `uploadImage`), le service (la limite de taille par type se vérifie dans `checkMediaRoom`, la photo passe par `uploadToCloudinary`, la vidéo par `uploadVideoToCloudinary`), le contrôleur et les trois routes.
- [ ] **Step 4: Run** le test, puis `tests/accessMatrix.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: routes d'administration des medias d'une variante`.

### Task 4: Suppression automatique

**Files:**
- Create: `server/src/modules/products/soldMedia.service.ts`, `server/src/middlewares/purgeSoldMedia.ts`
- Modify: `server/src/app.ts` (monter le middleware sur `["/orders", "/admin"]`), `server/src/index.ts` (balayage horaire), `server/src/modules/products/productAdmin.service.ts` (`updateProduct` : variantes retirées ; `deleteProduct`)
- Test: `server/tests/soldMedia.test.ts`

**Interfaces:**
- Consumes: Task 1, Task 3 (lignes `variantMedia`).
- Produces: `type MediaFile = { publicId: string; kind: "photo" | "video" }` ; `destroyMediaFiles(files: MediaFile[]): Promise<void>` (ne lève jamais : erreur journalisée) ; `mediaFilesOfVariants(where: Prisma.ProductVariantWhereInput): Promise<MediaFile[]>` (à appeler **avant** une suppression) ; `purgeSoldMedia(): Promise<number>` (supprime les lignes des variantes à `stock <= 0`, puis les fichiers ; rend le nombre de lignes supprimées) ; `purgeSoldMediaMiddleware(): RequestHandler` (sur `res.on("finish")`, pour une méthode autre que GET et un statut < 400, lance `void purgeSoldMedia().catch(journal)`) ; `startMediaSweep(intervalMs = 3_600_000): NodeJS.Timeout`.

- [ ] **Step 1: Write the failing tests** (utiliser `vi.waitFor` pour attendre la fin asynchrone) : « une commande du site qui prend le dernier exemplaire supprime ses médias (lignes et `deleteFromCloudinary` pour chaque fichier, vidéo avec `"video"`) » (modèle : `orders.test.ts`) ; « une vente au comptoir qui prend le dernier exemplaire fait de même » (modèle : `orders.storeSale.test.ts`) ; « un neuf à 2 exemplaires dont on prend 1 garde ses médias » ; « une correction de stock à 0 depuis la fiche produit (PATCH) supprime les médias » ; « une variante retirée du formulaire produit : ses fichiers sont supprimés » ; « un produit supprimé : fichiers de ses variantes supprimés » ; « un échec de Cloudinary n'empêche pas la commande d'aboutir et les lignes sont supprimées » ; « un GET ne déclenche rien » ; « annuler la commande qui remet le stock ne recrée pas les médias » ; « `purgeSoldMedia()` appelé directement supprime les médias d'une variante à stock 0 posés à la main (filet de sécurité) ».
- [ ] **Step 2: Run** `npx vitest run tests/soldMedia.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implémenter** `soldMedia.service.ts` et le middleware (même style que `releaseReservations.ts`). Dans `updateProduct` et `deleteProduct`, lire `mediaFilesOfVariants` avant la suppression, puis `destroyMediaFiles` après la transaction. Brancher `startMediaSweep` dans `index.ts`.
- [ ] **Step 4: Run** `npx vitest run` dans `server/` en entier. Expected: tout passe, sauf l'échec connu `backofficeSchema` sous Windows.
- [ ] **Step 5: Commit** `feat: suppression automatique des medias d'une variante vendue`.

### Task 5: Médias dans les réponses de l'API

**Files:**
- Modify: `server/src/modules/products/product.service.ts` (détail public : `media` dans le `select` des variantes, `posterUrl` ajouté pour une vidéo), `server/src/modules/products/productAdmin.service.ts` (détail admin : `id`, `kind`, `url`, `posterUrl`, `position`)
- Modify: `client/src/types/api.ts` (`VariantMedia`, champ `media?: VariantMedia[]` sur `Variant`)
- Test: `server/tests/variantMedia.read.test.ts`

**Interfaces:**
- Consumes: Task 2 (`posterOf`), Task 1.
- Produces: `GET /products/:slug` : chaque variante porte `media: { kind: "photo" | "video"; url: string; posterUrl: string | null }[]` triée par `position` (vide par défaut) ; `GET /admin/products/:id` : chaque variante porte `media: { id: number; kind; url; posterUrl: string | null; position: number }[]` ; client : `type VariantMedia = { kind: "photo" | "video"; url: string; posterUrl: string | null }`.

- [ ] **Step 1: Write the failing tests** : « le détail public d'une variante avec une photo et une vidéo les rend dans l'ordre, `posterUrl` rempli pour la vidéo seulement » ; « une variante sans média rend `media: []` » ; « le détail admin rend aussi les identifiants ».
- [ ] **Step 2: Run** `npx vitest run tests/variantMedia.read.test.ts`. Expected: FAIL.
- [ ] **Step 3: Ajouter** `media` aux deux `select` et le type côté client (champ facultatif exprès, comme `warrantyMonths` : une réponse en cache d'avant n'en a pas).
- [ ] **Step 4: Run** le test et `npx tsc --noEmit` dans `client/` et `server/`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: medias dans le detail d'un produit`.

### Task 6: Back-office, onglet « Photos et vidéo »

**Files:**
- Create: `client/src/features/admin/products/variantMedia.ts`, `client/src/features/admin/products/VariantMediaPanel.tsx`
- Modify: `client/src/features/admin/products/variantTabs.ts` (id `media`, libellé « Photos et vidéo »), `VariantEditor.tsx` (l'onglet), `client/src/features/admin/api/productsApi.ts` (trois mutations), `productDraft.ts` (`media` sur `VariantDraft`, chargé depuis l'API)
- Test: `client/src/features/admin/products/variantMedia.test.ts`, `variantTabs.test.ts` (ajout)

**Interfaces:**
- Consumes: Task 3 (routes), Task 5 (`media` du détail admin).
- Produces: `mediaPanelState(variant: { id?: number; stock: number | string }, media: { kind: "photo" | "video" }[]): { canAdd: boolean; reason: string | null; photos: number; videos: number }` (raison si variante pas enregistrée : « Enregistre d'abord la fiche » ; stock 0 : « Pas de médias sur une variante épuisée » ; plafonds atteints) ; `storyLink(input: { slug: string; color: string; condition: "new" | "refurbished"; sku: string }): string` (rend `/produits/<slug>/couleurs?couleur=<color>&etat=<neuf|occasion>&variante=<sku>`, valeurs encodées) ; mutations `addVariantMedia`, `removeVariantMedia`, `reorderVariantMedia` ; composant `VariantMediaPanel({ variant, productSlug })`.

- [ ] **Step 1: Write the failing tests** : `mediaPanelState` pour variante sans `id`, stock `0` (et `"0"`), 8 photos, 1 vidéo déjà là, cas libre ; `storyLink` encode « Titane noir » et choisit `neuf` ou `occasion` ; `variantTabs` contient l'onglet `media` pour un neuf et une occasion.
- [ ] **Step 2: Run** `npx vitest run src/features/admin/products` (dans `client/`). Expected: FAIL.
- [ ] **Step 3: Implémenter** les deux fonctions pures, les trois mutations (envoi immédiat comme `ColorPhotoField`, champ `media`), le panneau (miniatures avec bouton retirer, flèches pour l'ordre, un champ d'envoi, le lien de la story avec un bouton « Copier le lien ») et l'onglet.
- [ ] **Step 4: Run** les tests, `npx tsc --noEmit`, `npx eslint src/features/admin`. Expected: PASS, aucune erreur.
- [ ] **Step 5: Vérifier à l'écran** sur base locale jetable (`dzc-api`, `dzc-web` avec une base de test, pas Neon) : ajouter une photo, une vidéo, retirer, ordre, lien copié. L'envoi réel vers Cloudinary n'est pas testé ici (essai de Mehdi en ligne).
- [ ] **Step 6: Commit** `feat: onglet photos et video dans la fenetre d'une variante`.

### Task 7: Boutique, rangée de médias et lien de la story

**Files:**
- Create: `client/src/features/shop/variantMediaRules.ts`, `client/src/features/shop/VariantMediaStrip.tsx`
- Modify: `client/src/features/shop/colorViewerRules.ts` (`ViewerParams.variante`, `startView`), `ColorViewer.tsx`, `ViewerOffers.tsx`, `NewPicker.tsx` (prop `onCurrent`, prop `initialSku`), `RefurbishedList.tsx` (un clic sur la carte d'un appareil affiche ses médias, prop `onShowMedia`, prop `highlightSku`), `client/src/styles/color-viewer.css`, `client/src/app/(shop)/produits/[slug]/couleurs/page.tsx` (passe `variante`)
- Test: `client/src/features/shop/variantMediaRules.test.ts`, `colorViewerRules.test.ts` (ajouts)

**Interfaces:**
- Consumes: Task 5 (`Variant.media`).
- Produces: `shownMedia(variants: Variant[], sku: string | null): VariantMedia[]` (vide si le SKU manque ou n'a pas de médias) ; `startView(...)` rend en plus `variantSku: string | null` (non nul seulement si la variante existe, est publiée et en stock) ; `NewPicker({ onCurrent?: (variant: Variant) => void; initialSku?: string })` ; `RefurbishedList({ onShowMedia?: (variant: Variant) => void; highlightSku?: string })` ; `VariantMediaStrip({ media: VariantMedia[]; label: string })`.

- [ ] **Step 1: Write the failing tests** : `shownMedia` (SKU connu avec médias, SKU inconnu, `media` absent) ; `startView` avec `variante` valide → `offers` ouvert sur l'état de la variante, `index` de sa couleur, `variantSku` rempli ; avec un SKU inconnu, une variante à stock 0 → comportement actuel et `variantSku: null`.
- [ ] **Step 2: Run** `npx vitest run src/features/shop/variantMediaRules.test.ts src/features/shop/colorViewerRules.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implémenter** les règles ; dans `ColorViewer`, garder `shownSku` (nul au mode couleurs et à « Changer de couleur ») ; poser la photo du téléphone et la rangée dans un même bloc `viewer-visual` de la colonne de gauche ; la rangée est une grille de miniatures sous `.viewer-frame` (le téléphone ne bouge pas), un clic sur une photo l'agrandit, un clic sur la vidéo ouvre un lecteur (`<video playsInline preload="metadata" poster>`) que le client peut mettre en pause et relancer à volonté (clic sur la vidéo et bouton lecture/pause) avec un bouton son qui coupe et remet le son (décision de Mehdi du 26/11), fermeture par un bouton et Échap ; ne rien rendre sans médias. Plusieurs variantes de la même couleur (décision de Mehdi du 26/11) : les médias suivent la variante cliquée, jamais la couleur ; un appareil d'occasion se choisit en cliquant sa carte, un neuf par son stockage.
- [ ] **Step 4: Run** les tests, `npx tsc --noEmit`, `npx eslint src/features/shop`, puis `npx vitest run` en entier. Expected: PASS.
- [ ] **Step 5: Vérifier à l'écran** (base locale jetable, avec une variante à médias posés à la main) : neuf (stockage choisi → rangée), occasion (bouton → rangée), lien `?couleur=…&etat=occasion&variante=<sku>`, SKU inconnu, mode clair, téléphone 375 px et ordinateur 1365 px, sans défilement horizontal.
- [ ] **Step 6: Commit** `feat: photos et video d'une variante sous le telephone`.

### Task 8: Vérification d'ensemble

**Files:** aucun nouveau.

- [ ] **Step 1: Run** `npx vitest run` dans `server/` et dans `client/`, `npx tsc --noEmit` et `npx eslint` des deux côtés. Expected: tout passe, sauf l'échec connu `backofficeSchema`.
- [ ] **Step 2: Relecture indépendante** de la branche entière (un relecteur neuf), correction des défauts importants avec un test d'abord.
- [ ] **Step 3: Notes de mise en ligne** à donner à Mehdi : sauvegarde Neon, API (migration) puis front, un essai en ligne avec une vraie vidéo de story, puis regarder le compteur de crédits Cloudinary (le coût d'une transformation vidéo n'est pas confirmé) et vérifier la suppression après une vente.
