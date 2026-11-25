# Étape « Couleur et offres » : la visionneuse et les offres sur une seule page

Conception courte, 25/11/2026. Statut : en attente d'approbation de Mehdi, rien n'est codé.

## Pourquoi

La visionneuse de couleurs (grand téléphone qui change en fondu) est très appréciée. Aujourd'hui, « Voir les offres en Noir » ouvre une autre page (`/neuf?couleur=Noir` ou `/occasion?couleur=Noir`) avec le choix de stockage, le prix et le bouton panier. Mehdi veut garder l'affichage de la visionneuse : on ne change plus de page, la partie droite se remplace par les offres.

## Ce que voit le client

- **Mode couleurs** (celui d'aujourd'hui) : à droite, nom de la couleur, pastilles, disponibilité, bouton « Voir les offres en Noir ».
- **Mode offres** (au clic) : le téléphone reste à gauche, tel quel (même taille, même halo). À droite, le contenu de l'autre page : `NewPicker` pour un neuf (stockage, prix, Ajouter au panier), `RefurbishedList` pour une occasion. Un bouton « Changer de couleur » ramène le mode couleurs.
- **Frise** : l'étape 6 « Couleur » devient « Couleur et offres », dans les deux modes.

## Objectifs

- Aller de la couleur au panier sans changer de page.
- La couleur choisie reste dans l'adresse (`?couleur=Noir`), donc un lien partagé ou un rechargement retombe sur les mêmes offres.

## Hors périmètre

- Panier, API, règles de stock : inchangés.
- Les modèles sans couleurs et les accessoires gardent leur page actuelle (`ProductHeader`).

## Approches étudiées

- **A. Tout dans la visionneuse, deux modes à droite (choisie par Mehdi).** Instantané, peu de code neuf. À reprendre : les vérifications des pages `/neuf` et `/occasion` (pas de stock, retour aux couleurs).
- B. Garder les deux pages avec une transition qui laisse le téléphone en place : aucune logique dupliquée mais fragile (layout partagé entre routes). Écartée.
- C. Routes interceptées de Next : trop lourd. Écartée.

## Mes choix (à corriger)

1. **Mode offres : le téléphone est figé.** Flèches, glissement et pastilles sont masqués ; on change de couleur par « Changer de couleur ».
2. **Page de référence** (sans état choisi, Neuf et Occasion côte à côte) : chaque ligne ouvre les offres de son état.
3. **Adresse** : au clic, `replaceState` ajoute `?couleur=Noir` ; « Changer de couleur » l'enlève et garde `?apercu=Noir`.
4. **Arrivée directe avec `?couleur=` valide** (ancien lien, rechargement) : la visionneuse s'ouvre déjà en mode offres. Une couleur sans stock dans cet état renvoie au mode couleurs, comme les redirections actuelles.
5. **Données** : `product.variants` est déjà chargé ; la visionneuse reçoit en plus le type de produit (`kind`). Le filtrage par couleur réutilise `ofColor`, et la règle de repli reste dans `colorViewerRules.ts`, avec ses tests.
6. **Transition** : le contenu de droite change avec le même fondu que les photos ; le téléphone ne bouge pas.

## Au constructeur

Vérifier que `NewPicker` et `RefurbishedList` fonctionnent tels quels dans un composant client déjà monté, et que `ProductJourney` accepte « Couleur et offres » sans casser `journey.test.ts`. Ajouter des tests pour la logique nouvelle (état initial, repli sans stock, adresse), comme pour `colorViewerRules.ts`.
