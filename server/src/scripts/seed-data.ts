// Le catalogue de démo, inspiré de ce que DropZone vend sur Instagram. Les prix sont
// des exemples. Les images sont des illustrations servies par le front (client/public),
// en attendant les vraies photos envoyées depuis le back-office (Cloudinary).

export type SeedVariant = {
  sku: string;
  options: Record<string, string>;
  price: number;
  stock: number;
  condition?: "new" | "refurbished";
  grade?: number;
  batteryHealth?: number;
  replacedParts?: string[];
  defects?: string[];
  limitations?: string[];
  // Les articles offerts, désignés par leur SKU (une « affaire »).
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

export const CATEGORIES = [
  { name: "Smartphones", kind: "phone" },
  { name: "Ordinateurs portables", kind: "laptop" },
  { name: "Montres connectées", kind: "watch" },
  { name: "Accessoires", kind: "accessory" },
  { name: "Audiovisuel", kind: "audiovisual" },
] as const;

// Les marques de chaque catégorie, dans l'ordre des puces de la Boutique. Seulement
// celles qui ont des produits dans ce seed : une marque vide n'aurait aucune puce.
export const BRANDS: { category: string; name: string; makerName?: string }[] = [
  { category: "smartphones", name: "iPhone", makerName: "Apple" },
  { category: "smartphones", name: "Samsung", makerName: "Samsung" },
  { category: "smartphones", name: "Google", makerName: "Google" },
  { category: "smartphones", name: "Xiaomi", makerName: "Xiaomi" },
  { category: "ordinateurs-portables", name: "MacBook", makerName: "Apple" },
  { category: "ordinateurs-portables", name: "Dell", makerName: "Dell" },
  { category: "ordinateurs-portables", name: "HP", makerName: "HP" },
  { category: "ordinateurs-portables", name: "Lenovo", makerName: "Lenovo" },
  { category: "montres-connectees", name: "Apple Watch", makerName: "Apple" },
  { category: "montres-connectees", name: "Samsung", makerName: "Samsung" },
  { category: "accessoires", name: "Apple" },
  { category: "audiovisuel", name: "JBL" },
  { category: "audiovisuel", name: "GoPro" },
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
  // Un reconditionné est unique : stock 1, ou 0 s'il est déjà vendu.
  { stock = 1, ...details }: Partial<Pick<SeedVariant, "replacedParts" | "defects" | "limitations" | "gifts" | "stock">> = {},
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

export const PRODUCTS: SeedProduct[] = [
  // ---------- Smartphones ----------
  {
    name: "iPhone 15 Pro Max",
    category: "smartphones",
    model: "Apple|iPhone 15 Pro Max",
    description:
      "Le plus grand iPhone de la gamme 15 : châssis en titane, puce A17 Pro et zoom optique 5x. Disponible neuf sous blister ou reconditionné, chaque appareil testé et décrit pièce par pièce.",
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
      recond("IP15PM-R-001", { Stockage: "256 Go", Couleur: "Titane naturel" }, 199000, 10, 80),
      recond("IP15PM-R-002", { Stockage: "256 Go", Couleur: "Titane noir" }, 185000, 8, 95, {
        defects: ["Cache arrière fissuré"],
        gifts: CHARGER_AND_BUDS,
      }),
      recond("IP15PM-R-003", { Stockage: "512 Go", Couleur: "Titane blanc" }, 205000, 9, 88, {
        replacedParts: ["Caméra arrière"],
      }),
      recond("IP15PM-R-004", { Stockage: "256 Go", Couleur: "Titane bleu" }, 149000, 9, 91, {
        replacedParts: ["Écran"],
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
      "Dynamic Island, écran toujours allumé et capteur principal de 48 Mpx. Uniquement en reconditionné : chaque appareil a sa propre fiche d'état.",
    specs: { Écran: "6,1 pouces Super Retina XDR, 120 Hz", Puce: "A16 Bionic", Batterie: "3 200 mAh", Connecteur: "Lightning" },
    image: "/products/phone.svg",
    variants: [
      recond("IP14P-R-001", { Stockage: "128 Go", Couleur: "Violet" }, 129000, 9, 86, { gifts: [{ sku: "CHG-20W-BLANC" }] }),
      recond("IP14P-R-002", { Stockage: "256 Go", Couleur: "Noir" }, 139000, 10, 92),
      recond("IP14P-R-003", { Stockage: "128 Go", Couleur: "Argent" }, 99000, 8, 84, {
        replacedParts: ["Batterie"],
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
  {
    name: "Google Pixel 8 Pro",
    category: "smartphones",
    model: "Google|Pixel 8 Pro",
    description: "Le meilleur de la photo selon Google, avec 7 ans de mises à jour Android.",
    specs: { Écran: "6,7 pouces LTPO OLED, 120 Hz", Processeur: "Tensor G3", Batterie: "5 050 mAh" },
    image: "/products/phone.svg",
    variants: [
      recond("PX8P-R-001", { Stockage: "128 Go", Couleur: "Noir", RAM: "12 Go" }, 95000, 9, 90),
      recond("PX8P-R-002", { Stockage: "256 Go", Couleur: "Bleu", RAM: "12 Go" }, 89000, 7, 87, {
        replacedParts: ["Écran", "Cache arrière"],
        defects: ["Coins marqués"],
      }),
    ],
  },
  {
    name: "Xiaomi Redmi Note 13 Pro",
    category: "smartphones",
    model: "Xiaomi|Redmi Note 13 Pro",
    description: "Capteur de 200 Mpx et charge 67 W pour un petit budget.",
    specs: { Écran: "6,67 pouces AMOLED, 120 Hz", Batterie: "5 100 mAh", Charge: "67 W" },
    image: "/products/phone.svg",
    variants: [
      neuf("RN13P-256-NOIR", { Stockage: "256 Go", Couleur: "Noir", RAM: "8 Go" }, 52000, 7),
      neuf("RN13P-512-VIOLET", { Stockage: "512 Go", Couleur: "Violet", RAM: "12 Go" }, 61000, 3),
    ],
  },
  {
    name: "Samsung Galaxy Z Flip6",
    category: "smartphones",
    model: "Samsung|Galaxy Z Flip6",
    description: "Arrivage en préparation.",
    status: "draft",
    image: "/products/phone.svg",
    variants: [neuf("ZFLIP6-256-BLEU", { Stockage: "256 Go", Couleur: "Bleu", RAM: "12 Go" }, 175000, 0)],
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
    name: "Dell Latitude 5430",
    category: "ordinateurs-portables",
    model: "Dell|Latitude 5430",
    description: "Le PC professionnel robuste, idéal pour le bureau et les études.",
    specs: { Écran: "14 pouces Full HD", Ports: "USB-C, HDMI, Ethernet" },
    image: "/products/laptop.svg",
    variants: [
      recond(
        "LAT5430-R-001",
        { Processeur: "Intel Core i5 (12e gén.)", RAM: "16 Go", Stockage: "256 Go", Clavier: "QWERTZ (DE)" },
        69000,
        8,
        83,
        { defects: ["Usure du repose-poignets"] },
      ),
      recond(
        "LAT5430-R-002",
        { Processeur: "Intel Core i7 (12e gén.)", RAM: "16 Go", Stockage: "512 Go", Clavier: "AZERTY (FR)" },
        84000,
        9,
        90,
        { replacedParts: ["Clavier"] },
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
  {
    name: "Lenovo ThinkPad T14 Gen 3",
    category: "ordinateurs-portables",
    model: "Lenovo|ThinkPad T14 Gen 3",
    description: "Le clavier ThinkPad réputé, une autonomie solide et une garantie constructeur.",
    specs: { Écran: "14 pouces WUXGA", Poids: "1,37 kg" },
    image: "/products/laptop.svg",
    variants: [
      neuf(
        "T14G3-R5-16-512",
        { Processeur: "AMD Ryzen 5", RAM: "16 Go", Stockage: "512 Go", Clavier: "AZERTY (FR)", Couleur: "Noir" },
        119000,
        3,
      ),
    ],
  },

  // ---------- Montres connectées ----------
  {
    name: "Apple Watch Series 9",
    category: "montres-connectees",
    model: "Apple|Apple Watch Series 9",
    description: "Écran plus lumineux, double toucher et suivi complet de la santé.",
    specs: { Puce: "S9 SiP", Autonomie: "jusqu'à 18 h", Étanchéité: "50 m" },
    image: "/products/watch.svg",
    variants: [
      neuf("AW9-41-GPS-MINUIT", { Taille: "41 mm", Couleur: "Minuit", Connectivité: "GPS" }, 69000, 3),
      neuf("AW9-45-GPS-ARGENT", { Taille: "45 mm", Couleur: "Argent", Connectivité: "GPS" }, 75000, 2),
      recond("AW9-R-001", { Taille: "45 mm", Couleur: "Minuit", Connectivité: "GPS" }, 52000, 9, 93),
    ],
  },
  {
    name: "Apple Watch Ultra 2",
    category: "montres-connectees",
    model: "Apple|Apple Watch Ultra 2",
    description: "Boîtier en titane de 49 mm, jusqu'à 36 heures d'autonomie, pensée pour le sport.",
    specs: { Boîtier: "Titane 49 mm", Autonomie: "jusqu'à 36 h", Étanchéité: "100 m" },
    image: "/products/watch.svg",
    variants: [neuf("AWU2-49-CELL", { Taille: "49 mm", Couleur: "Titane naturel", Connectivité: "GPS + Cellular" }, 149000, 1)],
  },
  {
    name: "Samsung Galaxy Watch6",
    category: "montres-connectees",
    model: "Samsung|Galaxy Watch6",
    description: "La montre Wear OS de Samsung, avec suivi du sommeil et de la composition corporelle.",
    specs: { Autonomie: "jusqu'à 40 h", Étanchéité: "5 ATM" },
    image: "/products/watch.svg",
    variants: [
      neuf("GW6-40-NOIR", { Taille: "40 mm", Couleur: "Graphite", Connectivité: "Bluetooth" }, 39000, 4),
      neuf("GW6-44-ARGENT", { Taille: "44 mm", Couleur: "Argent", Connectivité: "Bluetooth" }, 43000, 2),
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

  // ---------- Audiovisuel (neuf uniquement) ----------
  {
    name: "GoPro HERO12 Black",
    category: "audiovisuel",
    brand: "GoPro",
    description: "Vidéo 5,3K, stabilisation HyperSmooth 6.0 et étanchéité jusqu'à 10 m.",
    specs: { Vidéo: "5,3K à 60 i/s", Étanchéité: "10 m" },
    image: "/products/camera.svg",
    variants: [neuf("GOPRO-12", {}, 69000, 2)],
  },
  {
    name: "Enceinte JBL Flip 6",
    category: "audiovisuel",
    brand: "JBL",
    description: "Enceinte Bluetooth étanche IP67, 12 heures d'autonomie.",
    specs: { Autonomie: "12 h", Étanchéité: "IP67" },
    image: "/products/speaker.svg",
    variants: [
      neuf("JBL-FLIP6-NOIR", { Couleur: "Noir" }, 21000, 5),
      neuf("JBL-FLIP6-ROUGE", { Couleur: "Rouge" }, 21000, 3),
    ],
  },
];
