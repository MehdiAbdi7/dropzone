import type { Condition, OrderStatus, OrderType, PaymentMethod, ProductKind } from "@/types/api";

// Les listes à cocher du back-office (table `choices` de l'API).
export type ChoiceGroup =
  | "storage"
  | "color"
  | "ram"
  | "processor"
  | "keyboard"
  | "size"
  | "connectivity"
  | "replaced_part"
  | "defect"
  | "limitation"
  | "sim"
  | "gpu"
  | "origin";

// Les options d'une variante, selon la sorte de produit. `key` est le texte affiché
// au client et rangé dans `options` ; `group` est la liste où piocher les valeurs.
export const OPTION_FIELDS: Record<ProductKind, { key: string; group: ChoiceGroup }[]> = {
  phone: [
    { key: "Stockage", group: "storage" },
    { key: "Couleur", group: "color" },
    { key: "RAM", group: "ram" },
    { key: "SIM", group: "sim" },
  ],
  tablet: [
    { key: "Stockage", group: "storage" },
    { key: "Couleur", group: "color" },
    { key: "Connectivité", group: "connectivity" },
    { key: "SIM", group: "sim" },
  ],
  laptop: [
    { key: "Processeur", group: "processor" },
    { key: "RAM", group: "ram" },
    { key: "Stockage", group: "storage" },
    { key: "Carte graphique", group: "gpu" },
    { key: "Clavier", group: "keyboard" },
    { key: "Couleur", group: "color" },
  ],
  watch: [
    { key: "Taille", group: "size" },
    { key: "Couleur", group: "color" },
    { key: "Connectivité", group: "connectivity" },
  ],
  accessory: [{ key: "Couleur", group: "color" }],
  audiovisual: [{ key: "Couleur", group: "color" }],
};

// PostgreSQL range un objet JSONB par longueur de clé, pas dans l'ordre d'écriture :
// l'ordre d'affichage des options et des caractéristiques est donc fixé ici.
export const OPTION_ORDER = [
  "Stockage",
  "RAM",
  "Processeur",
  "Carte graphique",
  "Clavier",
  "Taille",
  "Couleur",
  "Connectivité",
  "SIM",
];

// L'ordre des choix du neuf dans la Boutique : ce que le client choisit d'abord.
// La couleur pour un téléphone, une tablette ou une montre ; la puissance pour un PC.
export const OPTION_ORDER_BY_KIND: Record<ProductKind, string[]> = {
  phone: ["Couleur", "Stockage", "SIM", "RAM"],
  tablet: ["Couleur", "Stockage", "Connectivité", "SIM"],
  watch: ["Couleur", "Taille", "Connectivité"],
  laptop: ["Processeur", "RAM", "Stockage", "Carte graphique", "Clavier", "Couleur"],
  // Un accessoire : pour quel modèle, la taille d'écran d'un verre (refonte du 12/11), puis la
  // puissance, la longueur, le courant, le câble du pack, et la couleur.
  accessory: ["Modèle", "Taille de l'écran", "Puissance", "Longueur", "Courant", "Câble", "Couleur"],
  audiovisual: ["Couleur"],
};
// La même liste que l'API (series.service.ts), pour les 4 lignes de l'affiche d'une série.
export const SPEC_ORDER = [
  "Écran",
  "Puce",
  "Processeur",
  "Carte graphique",
  "Appareil photo",
  "Batterie",
  "Charge",
  "Autonomie",
  "Connecteur",
  "Ports",
  "Boîtier",
  "Étanchéité",
  "Vidéo",
  "Poids",
];

// Les caractéristiques proposées par défaut dans le formulaire, selon la sorte.
export const SPEC_SUGGESTIONS: Record<ProductKind, string[]> = {
  phone: ["Écran", "Puce", "Appareil photo", "Batterie", "Connecteur"],
  tablet: ["Écran", "Puce", "Appareil photo", "Batterie"],
  laptop: ["Écran", "Processeur", "Carte graphique", "Autonomie", "Poids", "Ports"],
  watch: ["Puce", "Autonomie", "Étanchéité"],
  accessory: [],
  audiovisual: ["Autonomie", "Étanchéité"],
};

export const DEVICE_KINDS: ProductKind[] = ["phone", "tablet", "laptop", "watch"];

export const KIND_LABELS: Record<ProductKind, string> = {
  phone: "Smartphone",
  tablet: "Tablette",
  laptop: "PC portable",
  watch: "Montre",
  accessory: "Accessoire",
  audiovisual: "Audiovisuel",
};

export const CONDITION_LABELS: Record<Condition, string> = {
  new: "Neuf scellé",
  refurbished: "Affaire",
};

// Les trois familles de la fiche d'état d'une affaire.
export const FAMILIES = [
  { field: "limitations", group: "limitation", label: "Limitations" },
  { field: "replacedParts", group: "replaced_part", label: "Pièces remplacées" },
  { field: "defects", group: "defect", label: "Défauts visibles" },
] as const;

export const CHOICE_GROUP_LABELS: Record<ChoiceGroup, string> = {
  storage: "Stockage",
  color: "Couleurs",
  ram: "RAM",
  processor: "Processeurs",
  keyboard: "Claviers",
  size: "Tailles de boîtier",
  connectivity: "Connectivité",
  replaced_part: "Pièces remplacées",
  defect: "Défauts visibles",
  limitation: "Limitations",
  sim: "SIM",
  gpu: "Cartes graphiques",
  origin: "Pays d'origine",
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  reserved: "Réservée",
  picked_up: "Récupérée",
  expired: "Expirée",
};

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  delivery: "Livraison",
  pickup: "Retrait au magasin",
  in_store: "Vente au magasin",
};

// Dans l'ordre de la liste déroulante : Espèces d'abord, choisi par défaut (14/11).
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Espèces",
  baridimob: "BaridiMob",
  ccp: "CCP",
  card: "Carte",
  transfer: "Virement",
};

// Ce que chaque statut veut dire pour le client (CGV et page de suivi).
export const STATUS_STEPS: { status: OrderStatus; text: string }[] = [
  { status: "pending", text: "Commande reçue, le magasin va vous appeler pour la confirmer." },
  { status: "confirmed", text: "Commande confirmée, le colis se prépare." },
  { status: "shipped", text: "Colis remis au livreur." },
  { status: "delivered", text: "Colis livré et payé à la livraison." },
];
