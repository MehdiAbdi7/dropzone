// Le catalogue de démo, inspiré de ce que DropZone vend sur Instagram. Les prix sont
// des exemples. Les images sont des illustrations servies par le front (client/public)
// ou des photos préparées par `npm run photos` (Cloudinary), en attendant les autres.

export type SeedVariant = {
  sku: string;
  options: Record<string, string>;
  price: number;
  stock: number;
  condition?: "new" | "refurbished";
  grade?: number;
  batteryHealth?: number;
  replacedParts?: string[];
  // Les pièces changées qui ne sont pas d'origine (les autres le sont).
  compatibleParts?: string[];
  defects?: string[];
  limitations?: string[];
  // Une affaire : avec sa boîte d'origine (sans boîte si rien n'est dit, voir seed.ts),
  // et les détails du gérant pour le client.
  withBox?: boolean;
  details?: string;
  // La garantie en mois ; sans elle, celle de DropZone pour le type et l'état (seed.ts).
  warrantyMonths?: number;
  // Les articles offerts, désignés par leur SKU (neuf scellé ou affaire).
  gifts?: { sku: string; quantity?: number }[];
};

export type SeedProduct = {
  name: string;
  category: string;
  // « Marque|Nom » d'un modèle de device-models.ts.
  model?: string;
  // La marque, pour un produit sans modèle d'appareil ; un appareil prend celle du
  // fabricant de son modèle (champ makerName de BRANDS).
  brand?: string;
  compatible?: string[];
  description: string;
  specs?: Record<string, string>;
  status?: "draft" | "published";
  image: string;
  variants: SeedVariant[];
};

// Ce que DropZone vend (relevé Instagram du 04/11) : pas de montres ni d'audiovisuel.
// Les accessoires restent, pour les articles offerts avec les appareils.
export const CATEGORIES = [
  { name: "Smartphones", kind: "phone" },
  { name: "Tablettes", kind: "tablet" },
  { name: "Ordinateurs portables", kind: "laptop" },
  { name: "Accessoires", kind: "accessory" },
] as const;

// Les marques de chaque catégorie, dans l'ordre des puces de la Boutique. Seulement
// celles qui ont des produits dans ce seed : une marque vide n'aurait aucune puce.
// L'import des annonces (`npm run import:dropzone`) ajoute les autres.
export const BRANDS: { category: string; name: string; makerName?: string }[] = [
  { category: "smartphones", name: "iPhone", makerName: "Apple" },
  { category: "smartphones", name: "Samsung", makerName: "Samsung" },
  { category: "ordinateurs-portables", name: "MacBook", makerName: "Apple" },
  { category: "ordinateurs-portables", name: "HP", makerName: "HP" },
  { category: "accessoires", name: "Apple" },
];

const neuf = (sku: string, options: Record<string, string>, price: number, stock: number): SeedVariant => ({
  sku,
  options,
  price,
  stock,
});

const recond = (
  sku: string,
  options: Record<string, string>,
  price: number,
  grade: number,
  batteryHealth: number,
  // Une affaire est unique : stock 1, ou 0 si elle est déjà vendue.
  {
    stock = 1,
    ...details
  }: Partial<
    Pick<
      SeedVariant,
      "replacedParts" | "compatibleParts" | "defects" | "limitations" | "withBox" | "details" | "gifts" | "stock"
    >
  > = {},
): SeedVariant => ({
  sku,
  options,
  price,
  stock,
  condition: "refurbished",
  grade,
  batteryHealth,
  ...details,
});

const CHARGER_AND_BUDS = [{ sku: "CHG-20W-BLANC" }, { sku: "BUDS-DZ-NOIR" }];

// Les deux iPhone 18 Pro partagent la même photo, réduite à la vraie hauteur de chacun.
const CLOUDINARY = "https://res.cloudinary.com/nscawk7d/image/upload";

export const PRODUCTS: SeedProduct[] = [
  // ---------- Smartphones ----------
  {
    name: "iPhone 18 Pro Max",
    category: "smartphones",
    model: "Apple|iPhone 18 Pro Max",
    description:
      "Le plus grand iPhone de la gamme 18 : écran de 6,9 pouces, puce A20 Pro et zoom de qualité optique 8x.",
    specs: {
      Écran: "6,9 pouces OLED, jusqu'à 120 Hz",
      Puce: "A20 Pro",
      "Appareil photo": "48 Mpx, zoom de qualité optique 8x",
      Connecteur: "USB-C",
    },
    image: `${CLOUDINARY}/v1793715036/dropzone/products/iphone-18-pro-max.webp`,
    // L'exemple de Mehdi : 3 Bordeaux (2 en 256 Go, 1 en 512 Go), 1 Noir, 1 Argent, Glacier épuisé.
    variants: [
      neuf("IP18PM-256-BORD", { Stockage: "256 Go", Couleur: "Bordeaux" }, 335000, 2),
      neuf("IP18PM-512-BORD", { Stockage: "512 Go", Couleur: "Bordeaux" }, 385000, 1),
      neuf("IP18PM-256-NOIR", { Stockage: "256 Go", Couleur: "Noir" }, 335000, 1),
      neuf("IP18PM-512-ARG", { Stockage: "512 Go", Couleur: "Argent" }, 385000, 1),
      neuf("IP18PM-256-GLAC", { Stockage: "256 Go", Couleur: "Glacier" }, 335000, 0),
      // Un neuf vendu sans boîte n'est pas un neuf scellé : c'est une affaire, avec sa radiographie.
      recond("IP18PM-256-BORD-SB", { Stockage: "256 Go", Couleur: "Bordeaux" }, 310000, 10, 100, {
        details: "Neuf, batterie 100 %, juste sans boîte",
      }),
      recond("IP18PM-R-001", { Stockage: "256 Go", Couleur: "Noir" }, 289000, 10, 100),
      recond("IP18PM-R-002", { Stockage: "256 Go", Couleur: "Bordeaux" }, 275000, 9, 97, {
        replacedParts: ["Écran"],
      }),
    ],
  },
  {
    name: "iPhone 18 Pro",
    category: "smartphones",
    model: "Apple|iPhone 18 Pro",
    description:
      "La puce A20 Pro et le zoom de qualité optique 8x du Pro Max, dans un format plus compact avec un écran de 6,3 pouces.",
    specs: {
      Écran: "6,3 pouces OLED, jusqu'à 120 Hz",
      Puce: "A20 Pro",
      "Appareil photo": "48 Mpx, zoom de qualité optique 8x",
      Connecteur: "USB-C",
    },
    image: `${CLOUDINARY}/v1793715037/dropzone/products/iphone-18-pro.webp`,
    variants: [
      neuf("IP18P-256-BORD", { Stockage: "256 Go", Couleur: "Bordeaux" }, 295000, 2),
      neuf("IP18P-256-GLAC", { Stockage: "256 Go", Couleur: "Glacier" }, 295000, 2),
      neuf("IP18P-512-NOIR", { Stockage: "512 Go", Couleur: "Noir" }, 345000, 1),
    ],
  },
  {
    name: "iPhone 15 Pro Max",
    category: "smartphones",
    model: "Apple|iPhone 15 Pro Max",
    description:
      "Le plus grand iPhone de la gamme 15 : châssis en titane, puce A17 Pro et zoom optique 5x. Disponible en neuf scellé ou en affaire, chaque affaire testée et décrite pièce par pièce.",
    specs: {
      Écran: "6,7 pouces Super Retina XDR, 120 Hz",
      Puce: "A17 Pro",
      "Appareil photo": "48 Mpx, zoom optique 5x",
      Batterie: "4 441 mAh",
      Connecteur: "USB-C",
    },
    image: "/products/phone.svg",
    variants: [
      neuf("IP15PM-256-NAT", { Stockage: "256 Go", Couleur: "Titane naturel", RAM: "8 Go" }, 245000, 3),
      neuf("IP15PM-256-NOIR", { Stockage: "256 Go", Couleur: "Titane noir", RAM: "8 Go" }, 245000, 2),
      neuf("IP15PM-512-BLEU", { Stockage: "512 Go", Couleur: "Titane bleu", RAM: "8 Go" }, 289000, 0),
      recond("IP15PM-R-001", { Stockage: "256 Go", Couleur: "Titane naturel" }, 199000, 10, 80, {
        withBox: true,
        details: "Comme neuf, vendu avec sa boîte d'origine",
      }),
      recond("IP15PM-R-002", { Stockage: "256 Go", Couleur: "Titane noir" }, 185000, 8, 95, {
        defects: ["Cache arrière fissuré"],
        gifts: CHARGER_AND_BUDS,
      }),
      recond("IP15PM-R-003", { Stockage: "512 Go", Couleur: "Titane blanc" }, 205000, 9, 88, {
        replacedParts: ["Caméra arrière"],
      }),
      recond("IP15PM-R-004", { Stockage: "256 Go", Couleur: "Titane bleu" }, 149000, 9, 91, {
        replacedParts: ["Écran"],
        compatibleParts: ["Écran"],
        limitations: ["Wi-Fi seulement (ne lit pas les cartes SIM)"],
      }),
      recond("IP15PM-R-005", { Stockage: "256 Go", Couleur: "Titane noir" }, 189000, 9, 90, { stock: 0 }),
    ],
  },
  {
    name: "iPhone 14 Pro",
    category: "smartphones",
    model: "Apple|iPhone 14 Pro",
    description:
      "Dynamic Island, écran toujours allumé et capteur principal de 48 Mpx. Uniquement en affaire : chaque appareil a sa propre fiche d'état.",
    specs: { Écran: "6,1 pouces Super Retina XDR, 120 Hz", Puce: "A16 Bionic", Batterie: "3 200 mAh", Connecteur: "Lightning" },
    image: "/products/phone.svg",
    variants: [
      recond("IP14P-R-001", { Stockage: "128 Go", Couleur: "Violet" }, 129000, 9, 86, { gifts: [{ sku: "CHG-20W-BLANC" }] }),
      recond("IP14P-R-002", { Stockage: "256 Go", Couleur: "Noir" }, 139000, 10, 92),
      recond("IP14P-R-003", { Stockage: "128 Go", Couleur: "Argent" }, 99000, 8, 84, {
        replacedParts: ["Batterie"],
        compatibleParts: ["Batterie"],
        limitations: ["Face ID ne fonctionne pas"],
      }),
    ],
  },
  {
    name: "iPhone 15",
    category: "smartphones",
    model: "Apple|iPhone 15",
    description: "Dynamic Island, USB-C et appareil photo de 48 Mpx, dans un dos en verre teinté.",
    specs: { Écran: "6,1 pouces Super Retina XDR", Puce: "A16 Bionic", Batterie: "3 349 mAh", Connecteur: "USB-C" },
    image: "/products/phone.svg",
    variants: [
      neuf("IP15-128-NOIR", { Stockage: "128 Go", Couleur: "Noir", RAM: "6 Go" }, 165000, 4),
      neuf("IP15-128-ROSE", { Stockage: "128 Go", Couleur: "Rose", RAM: "6 Go" }, 165000, 2),
      neuf("IP15-256-BLEU", { Stockage: "256 Go", Couleur: "Bleu", RAM: "6 Go" }, 185000, 1),
    ],
  },
  {
    name: "iPhone 13",
    category: "smartphones",
    model: "Apple|iPhone 13",
    description: "Le classique fiable : puce A15 Bionic, double appareil photo et très bonne autonomie.",
    specs: { Écran: "6,1 pouces Super Retina XDR", Puce: "A15 Bionic", Batterie: "3 240 mAh", Connecteur: "Lightning" },
    image: "/products/phone.svg",
    variants: [
      neuf("IP13-128-MINUIT", { Stockage: "128 Go", Couleur: "Minuit", RAM: "4 Go" }, 105000, 5),
      recond("IP13-R-001", { Stockage: "128 Go", Couleur: "Bleu" }, 72000, 9, 85),
      recond("IP13-R-002", { Stockage: "256 Go", Couleur: "Lumière stellaire" }, 79000, 8, 89, {
        defects: ["Rayures sur le cadre"],
        gifts: [{ sku: "CHG-20W-BLANC" }],
      }),
    ],
  },
  {
    name: "Samsung Galaxy S24 Ultra",
    category: "smartphones",
    model: "Samsung|Galaxy S24 Ultra",
    description: "Cadre en titane, S Pen intégré et zoom 100x. Le haut de gamme Android de Samsung.",
    specs: { Écran: "6,8 pouces Dynamic AMOLED 2X, 120 Hz", Processeur: "Snapdragon 8 Gen 3", Batterie: "5 000 mAh", "Appareil photo": "200 Mpx" },
    image: "/products/phone.svg",
    variants: [
      neuf("S24U-256-GRIS", { Stockage: "256 Go", Couleur: "Titane gris", RAM: "12 Go" }, 215000, 3),
      neuf("S24U-512-NOIR", { Stockage: "512 Go", Couleur: "Titane noir", RAM: "12 Go" }, 245000, 1),
      recond("S24U-R-001", { Stockage: "256 Go", Couleur: "Titane noir" }, 169000, 9, 94, {
        defects: ["Rayures légères sur l'écran"],
        gifts: [{ sku: "CHG-45W" }],
      }),
    ],
  },
  {
    name: "Samsung Galaxy A55",
    category: "smartphones",
    model: "Samsung|Galaxy A55",
    description: "Le milieu de gamme équilibré : écran 120 Hz, résistance IP67 et 4 ans de mises à jour.",
    specs: { Écran: "6,6 pouces Super AMOLED, 120 Hz", Processeur: "Exynos 1480", Batterie: "5 000 mAh" },
    image: "/products/phone.svg",
    variants: [
      neuf("A55-128-BLEU", { Stockage: "128 Go", Couleur: "Bleu", RAM: "8 Go" }, 69000, 6),
      neuf("A55-256-NOIR", { Stockage: "256 Go", Couleur: "Noir", RAM: "8 Go" }, 76000, 4),
    ],
  },

  // ---------- Ordinateurs portables ----------
  {
    name: "MacBook Air 13 pouces M2",
    category: "ordinateurs-portables",
    model: "Apple|MacBook Air 13 pouces M2",
    description: "Fin, silencieux (sans ventilateur) et jusqu'à 18 heures d'autonomie.",
    specs: { Écran: "13,6 pouces Liquid Retina", Autonomie: "jusqu'à 18 h", Poids: "1,24 kg" },
    image: "/products/laptop.svg",
    variants: [
      neuf(
        "MBA-M2-8-256-FR",
        { Processeur: "Apple M2", RAM: "8 Go", Stockage: "256 Go", Clavier: "AZERTY (FR)", Couleur: "Minuit" },
        175000,
        2,
      ),
      recond(
        "MBA-M2-R-001",
        { Processeur: "Apple M2", RAM: "8 Go", Stockage: "256 Go", Clavier: "QWERTY (US)", Couleur: "Argent" },
        139000,
        9,
        91,
      ),
    ],
  },
  {
    name: "MacBook Pro 14 pouces M3 Pro",
    category: "ordinateurs-portables",
    model: "Apple|MacBook Pro 14 pouces M3 Pro",
    description: "L'écran Liquid Retina XDR et la puissance du M3 Pro pour le montage et le développement.",
    specs: { Écran: "14,2 pouces Liquid Retina XDR", Autonomie: "jusqu'à 18 h", Ports: "3 Thunderbolt, HDMI, MagSafe" },
    image: "/products/laptop.svg",
    variants: [
      recond(
        "MBP14-M3P-R-001",
        { Processeur: "Apple M3 Pro", RAM: "18 Go", Stockage: "512 Go", Clavier: "AZERTY (FR)", Couleur: "Noir" },
        329000,
        10,
        96,
        { gifts: [{ sku: "CBL-CC-1M" }] },
      ),
    ],
  },
  {
    name: "HP EliteBook 840 G8",
    category: "ordinateurs-portables",
    model: "HP|EliteBook 840 G8",
    description: "Léger, solide et bien équipé en ports : un classique des entreprises européennes.",
    specs: { Écran: "14 pouces Full HD", Poids: "1,3 kg" },
    image: "/products/laptop.svg",
    variants: [
      recond(
        "EB840G8-R-001",
        { Processeur: "Intel Core i5 (11e gén.)", RAM: "16 Go", Stockage: "512 Go", Clavier: "AZERTY (FR)" },
        62000,
        9,
        88,
      ),
    ],
  },

  // ---------- Accessoires (neufs uniquement) ----------
  {
    name: "Chargeur USB-C 20 W",
    category: "accessoires",
    description: "Charge rapide pour iPhone et smartphones USB-C. Câble non inclus.",
    image: "/products/charger.svg",
    variants: [neuf("CHG-20W-BLANC", { Couleur: "Blanc" }, 2500, 15)],
  },
  {
    name: "Chargeur USB-C 45 W",
    category: "accessoires",
    description: "Charge super rapide pour Samsung Galaxy et PC portables USB-C.",
    image: "/products/charger.svg",
    variants: [neuf("CHG-45W", { Couleur: "Noir" }, 4500, 8)],
  },
  {
    name: "Écouteurs sans fil DZ Buds",
    category: "accessoires",
    description: "Écouteurs Bluetooth 5.3 avec boîtier de charge, jusqu'à 24 h d'écoute.",
    image: "/products/earbuds.svg",
    variants: [
      neuf("BUDS-DZ-NOIR", { Couleur: "Noir" }, 3900, 12),
      neuf("BUDS-DZ-BLANC", { Couleur: "Blanc" }, 3900, 10),
    ],
  },
  {
    name: "AirPods Pro (2e génération)",
    category: "accessoires",
    brand: "Apple",
    description: "Réduction de bruit active, audio spatial et boîtier MagSafe USB-C.",
    image: "/products/earbuds.svg",
    variants: [neuf("AIRPODS-PRO2", { Couleur: "Blanc" }, 42000, 4)],
  },
  {
    name: "Câble USB-C vers USB-C 1 m",
    category: "accessoires",
    description: "Câble tressé, charge jusqu'à 60 W.",
    image: "/products/cable.svg",
    variants: [neuf("CBL-CC-1M", {}, 1200, 30)],
  },
  {
    name: "Coque silicone MagSafe iPhone 15 Pro Max",
    category: "accessoires",
    brand: "Apple",
    compatible: ["Apple|iPhone 15 Pro Max"],
    description: "Silicone doux au toucher, aimants MagSafe intégrés.",
    image: "/products/case.svg",
    variants: [
      neuf("COQ-IP15PM-SIL-NOIR", { Couleur: "Noir" }, 2800, 9),
      neuf("COQ-IP15PM-SIL-BLEU", { Couleur: "Bleu" }, 2800, 5),
    ],
  },
  {
    name: "Coque antichoc incassable iPhone 15 Pro Max",
    category: "accessoires",
    compatible: ["Apple|iPhone 15 Pro Max"],
    description: "Coins renforcés contre les chutes, transparente pour garder la couleur du téléphone.",
    image: "/products/case.svg",
    variants: [neuf("COQ-IP15PM-AC", { Couleur: "Transparent" }, 1800, 12)],
  },
  {
    name: "Verre trempé incassable 6,7 pouces",
    category: "accessoires",
    compatible: ["Apple|iPhone 15 Pro Max", "Apple|iPhone 15 Plus", "Apple|iPhone 14 Pro Max"],
    description: "Protection d'écran 9H, pose facile avec cadre d'alignement.",
    image: "/products/screen-protector.svg",
    variants: [neuf("VT-67", {}, 1500, 25)],
  },
  {
    name: "Coque Galaxy S24 Ultra avec béquille",
    category: "accessoires",
    compatible: ["Samsung|Galaxy S24 Ultra"],
    description: "Coque rigide avec béquille pour regarder des vidéos en paysage.",
    image: "/products/case.svg",
    variants: [neuf("COQ-S24U-BEQ", { Couleur: "Noir" }, 2600, 6)],
  },
];
