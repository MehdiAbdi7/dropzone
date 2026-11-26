# Photos et vidéo d'une variante (design)

Demande de Mehdi, 26/11/2026. Statut : à approuver.

## Pourquoi

DropZone publie une story Instagram sur un téléphone précis et y ajoute un bouton « Acheter ». Le client arrive sur la page de ce téléphone, au moment des offres. Il doit pouvoir y revoir la vidéo de la story et voir d'autres photos du même appareil.

Ces médias appartiennent à **l'exemplaire** que la story montre, pas au modèle. Le cas courant est une occasion : un seul téléphone en stock, sa vidéo n'a de sens que pour lui. Quand il est vendu, ses médias n'ont plus aucune raison d'exister : ils sont supprimés, de la base et de Cloudinary.

## Objectifs

- Ajouter, retirer et ordonner des photos et une vidéo sur une variante, depuis la fenêtre de la variante dans la fiche produit du back-office.
- Les montrer sur la page de la couleur, sous la photo du téléphone, quand la variante est choisie.
- Arriver depuis la story sur la bonne variante, médias affichés (`?variante=<sku>`).
- Supprimer les médias, base et Cloudinary, dès que le stock de la variante tombe à 0.

## Hors périmètre

- La photo de la couleur (`model_color_photos`) ne change pas : elle reste celle du modèle et de la couleur, avec la visionneuse actuelle.
- Pas de médias au niveau du produit ni de la couleur.
- Pas de lien automatique avec Instagram : le bouton « Acheter » de la story est posé à la main par DropZone avec le lien de la variante.
- Pas de conservation des médias après la vente, pas d'historique, pas de corbeille.

## Ce qui ferait échouer le projet, même s'il « marche »

- Une vidéo d'un téléphone vendu qui reste sur Cloudinary.
- Des médias montrés pour une variante en rupture ou en brouillon.
- Une facture Cloudinary ou un quota dépassé par surprise.
- Un changement de la photo de couleur existante.

## Contraintes

- Cloudinary offre Free : 1,75 crédit sur 25 utilisé le 26/11 (1 crédit = 1 000 transformations, 1 Go de stockage ou 1 Go de bande passante). Le stockage reste très bas grâce à la suppression ; ce qui compte est la bande passante des lectures de vidéo.
- Migration additive seulement. API déployée avant le front.
- Tests d'abord. Les tests d'API ne touchent jamais Neon (le local lit Neon depuis le 06/11 : base jetable).
- Commits sans mention de Claude (dépôt public lu par des recruteurs).
- Mehdi lit le code mais ne l'écrit pas : le code doit être lisible, avec le pourquoi.

## Approches considérées

1. **Médias sur la variante, affichés quand elle est choisie (retenue).** Une table `variant_media`. C'est ce que demande Mehdi, et c'est la seule qui suit « ce qui se vend se supprime » : la vente d'un exemplaire supprime ses lignes par la même clé.
2. Médias sur la couleur du modèle : plus simple (une galerie par couleur), mais contraire à la demande (la vidéo d'un exemplaire serait montrée pour tous, et la suppression à la vente n'aurait pas de sens).
3. Page ou fenêtre de médias à part : ne répond pas à « sous la photo du téléphone, à gauche ».

## Décisions de Mehdi

- La photo du téléphone reste exactement comme aujourd'hui ; les médias s'ajoutent en plus.
- Les médias se règlent sur la variante précise, dans le back-office.
- Suppression **quand la vente est faite (payée)**, base et Cloudinary (précisé par Mehdi le 26/11, après une première version « dès que le stock tombe à 0 » : une réservation non récupérée remet l'article en vente, il doit retrouver ses photos et sa vidéo). Vente faite = commande « récupérée » (vente au comptoir, échange, remplacement, réservation récupérée) ou « encaissée » (livraison). Tant qu'une commande en attente, confirmée, expédiée, livrée ou réservée (deux jours ou illimitée) tient l'exemplaire, les médias restent ; une commande annulée ou expirée qui remet le stock ne perd rien. Un stock mis à 0 depuis la fiche, sans commande en cours, supprime aussi les médias.
- Envoi (ajouté le 26/11 après la relecture) : une **vidéo part directement du navigateur chez Cloudinary** (l'API signe l'envoi puis enregistre ce que Cloudinary a reçu), car la réécriture `/api` de Vercel a un délai de 120 s et une taille d'envoi non documentée ; les **photos** traversent l'API et sont limitées à **4 Mo** (sous les 4,5 Mo des Functions Vercel). Une vidéo envoyée mais jamais enregistrée (onglet fermé) est retrouvée et supprimée par le balayage horaire après une heure. Un fichier dont la suppression Cloudinary échoue garde une trace (`media_orphans`) réessayée par le balayage.
- Aucun média visible avant qu'une variante soit choisie : sous le téléphone, rien tant que le client n'a pas choisi (stockage d'un neuf, appareil d'une occasion). Venant de la story, la variante est déjà choisie.

## Conception

### Données

Table `variant_media` : `id`, `variant_id` (clé étrangère, suppression en cascade), `kind` (`photo` ou `video`), `url`, `public_id`, `position`, `created_at`. Index sur `variant_id`. Migration additive.

### API d'administration

- `POST /admin/variants/:id/media` (envoi d'un fichier, photo ou vidéo) : refusé si la variante est à stock 0.
- `DELETE /admin/variants/:id/media/:mediaId`.
- Réordonner : `PATCH /admin/variants/:id/media/order`.
- Mêmes droits que la modification d'une variante (table de droits existante, fermée par défaut).
- Les photos reprennent `uploadToCloudinary`. La vidéo demande `resource_type: "video"`, qui n'existe pas dans `cloudinary.ts`, et une suppression par `destroy(publicId, { resource_type: "video" })`.

### API publique

Chaque variante de `ProductDetail` porte `media: [{ kind, url, posterUrl? }]`, vide par défaut. La vignette d'une vidéo est son image de couverture Cloudinary.

### Suppression automatique

Une fonction unique, `purgeVariantMedia(variantId)` : supprime les lignes en base dans la transaction, puis supprime les fichiers Cloudinary après la validation. Une erreur Cloudinary est écrite dans les logs et ne bloque jamais la vente. Appelée :

- quand une baisse de stock amène la variante à 0 (création de commande, modification de commande, vente au comptoir, commande par téléphone, échange, correction de stock du back-office) ;
- à la suppression d'une variante ou d'un produit (la cascade de la base ne prévient pas Cloudinary : lire les `public_id` avant) ;
- un balayage de sécurité horaire dans l'API supprime les médias de toute variante à stock 0 (filet si un chemin de vente a été oublié).

### Back-office

Dans la fenêtre de la variante (fiche produit), une section « Photos et vidéo » : ajout (photos, une seule vidéo), retrait, ordre. Désactivée avec un message pour une variante à stock 0. Plafonds proposés : 8 photos et 1 vidéo par variante, vidéo de 50 Mo au plus (réglables).

### Boutique

- Une rangée de miniatures (`VariantMediaStrip`) sous `.viewer-frame` de la visionneuse, sur ordinateur et sur téléphone. Clic sur une photo : agrandie ; clic sur la vidéo : lecteur (`<video controls playsInline preload="metadata">`).
- Un neuf : `NewPicker` signale la variante (le stockage) choisie à la visionneuse. Une occasion : chaque appareil de `RefurbishedList` a un bouton « Photos et vidéo » (seulement s'il a des médias) qui remplit la rangée.
- Lien de la story : `?couleur=…&etat=…&variante=<sku>` ouvre les offres de cette couleur avec cette variante choisie (extension de `startView` et de `viewerSearch` dans `colorViewerRules.ts`). Un `sku` inconnu, en rupture ou en brouillon est ignoré : retour au comportement actuel.
- La vidéo est livrée compressée (qualité et format automatiques, largeur limitée à 720 px).

## Mes choix (à vérifier)

- Plafonds : 8 photos, 1 vidéo, 50 Mo.
- Refus d'envoi sur une variante à stock 0 : sans cela, ses médias ne seraient jamais supprimés (la purge se déclenche à la baisse du stock).
- Balayage horaire de sécurité dans l'API.
- Vignette de la vidéo : l'image de couverture fournie par Cloudinary.
- Compression de la vidéo à l'envoi plutôt qu'à chaque lecture, pour ne pas multiplier les transformations (leur coût pour la vidéo est à confirmer sur le compteur après un premier essai).

## Laissé à celui qui construit

- La liste exacte des endroits où le stock baisse (le recensement rapide du 26/11 a trouvé `order.service.ts`, `orderEdit.service.ts`, `phoneOrder.service.ts`, la vente au comptoir et la correction de stock ; à compléter).
- La forme exacte de l'état partagé entre `NewPicker` et la visionneuse.
- Le nombre de tâches, l'ordre (base, API, back-office, boutique), les tests.
- Réglage de la limite d'envoi côté serveur (`multer`) pour une vidéo.
