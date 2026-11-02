import type { Condition, OrderStatus, ProductKind } from "@/types/api";

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
  | "limitation";

// Les options d'une variante, selon la sorte de produit. `key` est le texte affiché
// au client et rangé dans `options` ; `group` est la liste où piocher les valeurs.
export const OPTION_FIELDS: Record<ProductKind, { key: string; group: ChoiceGroup }[]> = {
  phone: [
    { key: "Stockage", group: "storage" },
    { key: "Couleur", group: "color" },
    { key: "RAM", group: "ram" },
  ],
  laptop: [
    { key: "Processeur", group: "processor" },
    { key: "RAM", group: "ram" },
    { key: "Stockage", group: "storage" },
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
export const OPTION_ORDER = ["Stockage", "RAM", "Processeur", "Clavier", "Taille", "Couleur", "Connectivité"];
export const SPEC_ORDER = [
  "Écran",
  "Puce",
  "Processeur",
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
  laptop: ["Écran", "Autonomie", "Poids", "Ports"],
  watch: ["Puce", "Autonomie", "Étanchéité"],
  accessory: [],
  audiovisual: ["Autonomie", "Étanchéité"],
};

export const DEVICE_KINDS: ProductKind[] = ["phone", "laptop", "watch"];

export const KIND_LABELS: Record<ProductKind, string> = {
  phone: "Smartphone",
  laptop: "PC portable",
  watch: "Montre",
  accessory: "Accessoire",
  audiovisual: "Audiovisuel",
};

export const CONDITION_LABELS: Record<Condition, string> = {
  new: "Neuf",
  refurbished: "Reconditionné",
};

// Les trois familles de la fiche d'état d'un reconditionné.
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
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

// Ce que chaque statut veut dire pour le client (CGV et page de suivi).
export const STATUS_STEPS: { status: OrderStatus; text: string }[] = [
  { status: "pending", text: "Commande reçue, le magasin va vous appeler pour la confirmer." },
  { status: "confirmed", text: "Commande confirmée, le colis se prépare." },
  { status: "shipped", text: "Colis remis au livreur." },
  { status: "delivered", text: "Colis livré et payé à la livraison." },
];
