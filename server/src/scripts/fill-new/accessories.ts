// Les accessoires à créer : coques par famille (iPhone, Samsung), verres par qualité et par
// taille d'écran (refonte du 12/11), blocs chargeurs, câbles et packs (bloc + câble). Prix relevés
// sur Ouedkniss le 12/11/2026 (voir le rapport).
// Les descriptions sont génériques : à adapter aux articles que DropZone achète vraiment.
import { slugify } from "../../utils/slugify.js";

export type AccessoryVariant = { sku: string; options: Record<string, string>; price: number; stock: number };

export type AccessoryProduct = {
  name: string;
  // Le type d'accessoire du back-office (la « marque » de la catégorie Accessoires).
  type: "Coques" | "Chargeurs" | "Câbles" | "Incassable Écran";
  // La marque dans le type : Apple, Samsung, Anker (chargeurs, câbles) ; iPhone, Samsung (coques).
  // null : sans marque (les verres incassables, 12/11).
  maker: string | null;
  description: string;
  specs: Record<string, string>;
  variants: AccessoryVariant[];
  // Les modèles d'appareils pour lesquels l'accessoire est fait (device_models.name).
  compatible: string[];
  // Les variantes ont une « Taille de l'écran » : chacune reçoit les téléphones de cette taille.
  compatibleBySize?: true;
  image: "case" | "screen-protector" | "charger" | "cable";
};

const STOCK = 10;

export const IPHONE_SERIES: Record<string, string[]> = {
  "iPhone 18": ["iPhone 18 Pro", "iPhone 18 Pro Max"],
  "iPhone 17": ["iPhone Air", "iPhone 17", "iPhone 17 Pro", "iPhone 17 Pro Max"],
  "iPhone 16": ["iPhone 16e", "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max"],
  "iPhone 15": ["iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max"],
  "iPhone 14": ["iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max"],
  "iPhone 13": ["iPhone 13 mini", "iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max"],
  "iPhone 12": ["iPhone 12 mini", "iPhone 12", "iPhone 12 Pro", "iPhone 12 Pro Max"],
  "iPhone 11": ["iPhone 11", "iPhone 11 Pro", "iPhone 11 Pro Max"],
};

export const SAMSUNG_SERIES: Record<string, string[]> = {
  "Galaxy S25": ["Galaxy S25", "Galaxy S25+", "Galaxy S25 Ultra", "Galaxy S25 Edge"],
  "Galaxy S24": ["Galaxy S24", "Galaxy S24+", "Galaxy S24 Ultra", "Galaxy S24 FE"],
  "Galaxy S23": ["Galaxy S23", "Galaxy S23+", "Galaxy S23 Ultra", "Galaxy S23 FE"],
  "Galaxy S22": ["Galaxy S22", "Galaxy S22+", "Galaxy S22 Ultra"],
  "Galaxy S21": ["Galaxy S21", "Galaxy S21+", "Galaxy S21 Ultra", "Galaxy S21 FE"],
  "Galaxy A5x": ["Galaxy A54", "Galaxy A55", "Galaxy A56"],
  "Galaxy A3x": ["Galaxy A34", "Galaxy A35", "Galaxy A36"],
};

const sku = (prefix: string, ...parts: string[]) =>
  `${prefix}-${parts.map((part) => slugify(part).toUpperCase()).join("-")}`.slice(0, 40);

const list = (models: string[]) =>
  models.length === 1 ? models[0] : `${models.slice(0, -1).join(", ")} et ${models[models.length - 1]}`;

type Family = { brand: "iPhone" | "Samsung"; models: string[]; magsafe: string[] };
const FAMILIES: Family[] = [
  {
    brand: "iPhone",
    models: Object.values(IPHONE_SERIES).flat(),
    // iPhone 11 : pas de MagSafe.
    magsafe: Object.entries(IPHONE_SERIES).flatMap(([name, models]) => (name === "iPhone 11" ? [] : models)),
  },
  { brand: "Samsung", models: Object.values(SAMSUNG_SERIES).flat(), magsafe: [] },
];

// Les coques, une par sorte et par famille de téléphones (refonte du 12/11 : 5 produits au lieu
// de 37) ; le modèle se choisit dans la fenêtre de la Boutique. Mêmes prix, stocks et SKU
// qu'avant, une variante par modèle (et par couleur pour la MagSafe).
function cases(): AccessoryProduct[] {
  const out: AccessoryProduct[] = [];
  for (const { brand, models, magsafe } of FAMILIES) {
    const family = brand === "iPhone" ? "iPhone 11 à 18" : "Galaxy S21 à S25, A3x et A5x";
    const byModel = (prefix: string, price: number, list: string[], extra: Record<string, string>[] = [{}]) =>
      list.flatMap((model) =>
        extra.map((more) => ({ sku: sku(prefix, model, ...Object.values(more)), options: { Modèle: model, ...more }, price, stock: STOCK })),
      );
    out.push({
      name: `Coque antichoc transparente ${brand}`,
      type: "Coques",
      maker: brand,
      description: `Coque antichoc transparente pour ${family}. Elle laisse voir la couleur de l'appareil, protège les coins contre les chutes et garde un accès complet aux ports et aux boutons. Choisis ton modèle.`,
      specs: { Matière: "Plastique souple (TPU) transparent", Protection: "Coins renforcés contre les chocs", Compatibilité: family },
      variants: byModel("COQT", 2_500, models),
      compatible: models,
      image: "case",
    });
    if (magsafe.length > 0) {
      out.push({
        name: `Coque silicone MagSafe ${brand}`,
        type: "Coques",
        maker: brand,
        description: "Coque en silicone avec aimants MagSafe pour iPhone 12 à 18. Compatible avec les chargeurs, supports et portefeuilles MagSafe, douce au toucher. Choisis ton modèle et ta couleur.",
        specs: { Matière: "Silicone", MagSafe: "Oui, aimants intégrés", Compatibilité: "iPhone 12 à 18" },
        variants: byModel("COQM", 4_500, magsafe, [{ Couleur: "Noir" }, { Couleur: "Bleu" }, { Couleur: "Rouge" }]),
        compatible: magsafe,
        image: "case",
      });
    }
    out.push({
      name: `Coque antichoc renforcée ${brand}`,
      type: "Coques",
      maker: brand,
      description: `Coque antichoc renforcée (double couche) pour ${family}. Rebords surélevés autour de l'écran et de l'appareil photo, pour une protection maximale au quotidien. Choisis ton modèle.`,
      specs: { Matière: "TPU et polycarbonate", Protection: "Double couche, rebords surélevés", Compatibilité: family },
      variants: byModel("COQR", 7_500, models),
      compatible: models,
      image: "case",
    });
  }
  return out;
}

// Les tailles d'écran des verres : celles des téléphones du catalogue (12/11).
export const SCREEN_SIZES = ["4,7", "5,4", "5,5", "5,8", "6,1", "6,2", "6,3", "6,4", "6,5", "6,6", "6,7", "6,8", "6,9"].map(
  (size) => `${size} pouces`,
);

// Les verres incassables (refonte du 12/11, décision de Mehdi) : sans marque, un produit par
// qualité, une variante par taille d'écran. Chaque taille reçoit les téléphones du catalogue qui
// ont cette taille (compatibleBySize) ; le gérant corrige la liste dans le back-office.
// Qualités et prix relevés sur Ouedkniss et Dzairgo le 12/11 (cahier, section 5.1).
const GLASSES: { quality: string; code: string; price: number; description: string; specs: Record<string, string> }[] = [
  {
    quality: "Standard 9H",
    code: "STD",
    price: 1_000,
    description: "Verre trempé 9H transparent. La protection de base contre les rayures et les chocs.",
    specs: { Matière: "Verre trempé", Dureté: "9H", Bords: "Transparents" },
  },
  {
    quality: "Céramique 9D",
    code: "CER",
    price: 1_200,
    description: "Film en céramique souple : il plie au lieu de se fendre, bords noirs, toucher doux.",
    specs: { Matière: "Céramique souple", Bords: "Noirs" },
  },
  {
    quality: "Full glue 9H",
    code: "FG",
    price: 1_500,
    description: "Verre trempé collé sur tout l'écran, bords noirs : pas de bulles, pas de poussière sous le verre.",
    specs: { Matière: "Verre trempé", Dureté: "9H", Collage: "Sur tout l'écran", Bords: "Noirs" },
  },
  {
    quality: "Privacy",
    code: "PRV",
    price: 2_000,
    description: "Verre trempé fumé anti-espion : l'écran n'est lisible que de face.",
    specs: { Matière: "Verre trempé fumé", Dureté: "9H", Confidentialité: "Lisible de face seulement" },
  },
];

function glasses(): AccessoryProduct[] {
  return GLASSES.map(({ quality, code, price, description, specs }) => ({
    name: `Verre incassable ${quality}`,
    type: "Incassable Écran",
    maker: null,
    description: `${description} Choisis la taille de ton écran, ou tape le nom de ton téléphone.`,
    specs,
    variants: SCREEN_SIZES.map((size) => ({
      sku: `VER-${code}-${size.split(" ")[0].replace(",", "")}`,
      options: { "Taille de l'écran": size },
      price,
      stock: STOCK,
    })),
    compatible: [],
    compatibleBySize: true,
    image: "screen-protector",
  }));
}

// Les blocs, les câbles et les packs. Le bloc se vend seul, le câble seul, et le pack réunit
// les deux pour former le chargeur complet : prix du bloc + prix du câble, moins 10 % (arrondi
// à 100 DA). Type-C et Lightning : le câble du pack se choisit.
type Block = { label: string; price: number };
type Cable = { label: string; price: number };

const round100 = (value: number) => Math.round(value / 100) * 100;
const pack = (block: number, cable: number) => round100((block + cable) * 0.9);

function chargers(): AccessoryProduct[] {
  const apple20: Block = { label: "20 W", price: 6_500 };
  const samsung: Block[] = [{ label: "25 W", price: 3_500 }, { label: "45 W", price: 5_500 }];
  const anker: Block[] = [
    { label: "20 W", price: 3_500 },
    { label: "30 W", price: 4_500 },
    { label: "45 W", price: 5_500 },
    { label: "65 W", price: 6_000 },
    { label: "100 W", price: 11_000 },
  ];
  const appleLightning: Cable = { label: "Lightning", price: 3_500 };
  const appleUsbC: Cable = { label: "USB-C", price: 3_500 };
  const samsungUsbC: Cable = { label: "USB-C", price: 1_500 };
  const ankerLightning: Cable = { label: "Lightning", price: 3_200 };
  const ankerUsbC: Cable = { label: "USB-C", price: 3_000 };
  const v = (id: string, options: Record<string, string>, price: number): AccessoryVariant => ({
    sku: id,
    options,
    price,
    stock: STOCK,
  });

  return [
    // ---------- Blocs seuls ----------
    {
      name: "Bloc chargeur Apple USB-C 20 W",
      type: "Chargeurs",
      maker: "Apple",
      description: "Bloc d'alimentation Apple USB-C de 20 W, pour recharger rapidement un iPhone ou un iPad. Câble non inclus : voir les câbles USB-C ou le pack.",
      specs: { Port: "USB-C", Puissance: "20 W", "Câble inclus": "Non" },
      variants: [v("BLOC-APPLE-20W", { Puissance: apple20.label }, apple20.price)],
      compatible: [],
      image: "charger",
    },
    {
      name: "Bloc chargeur Samsung USB-C",
      type: "Chargeurs",
      maker: "Samsung",
      description: "Bloc d'alimentation Samsung USB-C à charge rapide, en 25 W ou 45 W. Câble non inclus : voir les câbles USB-C ou le pack.",
      specs: { Port: "USB-C", "Charge rapide": "Super Fast Charging", "Câble inclus": "Non" },
      variants: samsung.map((b) => v(`BLOC-SAMSUNG-${b.label.replace(" ", "")}`, { Puissance: b.label }, b.price)),
      compatible: [],
      image: "charger",
    },
    {
      name: "Bloc chargeur Anker Nano USB-C",
      type: "Chargeurs",
      maker: "Anker",
      description: "Bloc d'alimentation Anker Nano USB-C, compact, en 20, 30, 45, 65 ou 100 W : un seul chargeur pour le téléphone, la tablette ou l'ordinateur portable. Câble non inclus.",
      specs: { Port: "USB-C", Technologie: "GaN compact", "Câble inclus": "Non" },
      variants: anker.map((b) => v(`BLOC-ANKER-${b.label.replace(" ", "")}`, { Puissance: b.label }, b.price)),
      compatible: [],
      image: "charger",
    },
    // ---------- Câbles seuls ----------
    {
      name: "Câble Apple USB-C vers Lightning",
      type: "Câbles",
      maker: "Apple",
      description: "Câble Apple USB-C vers Lightning de 1 m, pour charger et synchroniser un iPhone ou un iPad à connecteur Lightning.",
      specs: { Connecteurs: "USB-C vers Lightning", Longueur: "1 m" },
      variants: [v("CABLE-APPLE-USBC-LIGHTNING", { Longueur: "1 m" }, appleLightning.price)],
      compatible: [],
      image: "cable",
    },
    {
      name: "Câble Apple USB-C vers USB-C",
      type: "Câbles",
      maker: "Apple",
      description: "Câble Apple USB-C vers USB-C de 1 m, pour charger et synchroniser un iPhone 15 ou plus récent, un iPad ou un MacBook.",
      specs: { Connecteurs: "USB-C vers USB-C", Longueur: "1 m" },
      variants: [v("CABLE-APPLE-USBC-USBC", { Longueur: "1 m" }, appleUsbC.price)],
      compatible: [],
      image: "cable",
    },
    {
      name: "Câble Samsung USB-C vers USB-C",
      type: "Câbles",
      maker: "Samsung",
      description: "Câble Samsung USB-C vers USB-C, en 3 A pour la charge courante ou 5 A pour la charge super rapide 45 W.",
      specs: { Connecteurs: "USB-C vers USB-C", Longueur: "1,8 m" },
      variants: [
        v("CABLE-SAMSUNG-USBC-3A", { Courant: "3 A" }, samsungUsbC.price),
        v("CABLE-SAMSUNG-USBC-5A", { Courant: "5 A" }, 2_500),
      ],
      compatible: [],
      image: "cable",
    },
    {
      name: "Câble Anker USB-C vers Lightning (MFi)",
      type: "Câbles",
      maker: "Anker",
      description: "Câble Anker USB-C vers Lightning certifié MFi (Made for iPhone), en 0,9 m ou 1,8 m, pour charger un iPhone à connecteur Lightning.",
      specs: { Connecteurs: "USB-C vers Lightning", Certification: "MFi (Made for iPhone)" },
      variants: [
        v("CABLE-ANKER-LIGHTNING-09M", { Longueur: "0,9 m" }, 2_950),
        v("CABLE-ANKER-LIGHTNING-18M", { Longueur: "1,8 m" }, 3_500),
      ],
      compatible: [],
      image: "cable",
    },
    {
      name: "Câble Anker USB-C vers USB-C 240 W",
      type: "Câbles",
      maker: "Anker",
      description: "Câble Anker USB-C vers USB-C de 1,5 m, jusqu'à 240 W : il convient à la charge d'un téléphone, d'une tablette ou d'un ordinateur portable.",
      specs: { Connecteurs: "USB-C vers USB-C", Puissance: "Jusqu'à 240 W", Longueur: "1,5 m" },
      variants: [v("CABLE-ANKER-USBC-240W", { Longueur: "1,5 m" }, ankerUsbC.price)],
      compatible: [],
      image: "cable",
    },
    // ---------- Packs : le bloc et le câble ensemble ----------
    {
      name: "Pack chargeur iPhone 20 W (bloc + câble)",
      type: "Chargeurs",
      maker: "Apple",
      description: "Le chargeur iPhone complet : le bloc Apple USB-C 20 W et son câble, au choix Lightning (iPhone 14 et avant) ou USB-C (iPhone 15 et après), moins cher qu'à l'unité.",
      specs: { Contenu: "Bloc Apple 20 W + câble 1 m", Puissance: "20 W" },
      variants: [
        v("PACK-APPLE-20W-LIGHTNING", { Câble: "Lightning" }, pack(apple20.price, appleLightning.price)),
        v("PACK-APPLE-20W-USBC", { Câble: "USB-C" }, pack(apple20.price, appleUsbC.price)),
      ],
      compatible: [],
      image: "charger",
    },
    {
      name: "Pack chargeur Samsung (bloc + câble USB-C)",
      type: "Chargeurs",
      maker: "Samsung",
      description: "Le chargeur Samsung complet : le bloc USB-C en 25 W ou 45 W et son câble USB-C, moins cher qu'à l'unité.",
      specs: { Contenu: "Bloc Samsung + câble USB-C" },
      variants: [
        v("PACK-SAMSUNG-25W", { Puissance: "25 W" }, pack(3_500, samsungUsbC.price)),
        v("PACK-SAMSUNG-45W", { Puissance: "45 W" }, pack(5_500, 2_500)),
      ],
      compatible: [],
      image: "charger",
    },
    {
      name: "Pack chargeur Anker Nano (bloc + câble)",
      type: "Chargeurs",
      maker: "Anker",
      description: "Le chargeur Anker complet : le bloc Nano de 20 à 100 W et son câble, au choix Lightning (en 20 et 30 W, pour iPhone) ou USB-C, moins cher qu'à l'unité.",
      specs: { Contenu: "Bloc Anker Nano + câble 1 m environ" },
      variants: anker.flatMap((b) => {
        const usbC = v(`PACK-ANKER-${b.label.replace(" ", "")}-USBC`, { Puissance: b.label, Câble: "USB-C" }, pack(b.price, ankerUsbC.price));
        const lightning = v(`PACK-ANKER-${b.label.replace(" ", "")}-LIGHTNING`, { Puissance: b.label, Câble: "Lightning" }, pack(b.price, ankerLightning.price));
        return b.label === "20 W" || b.label === "30 W" ? [lightning, usbC] : [usbC];
      }),
      compatible: [],
      image: "charger",
    },
  ];
}

export function buildAccessories(): AccessoryProduct[] {
  return [...chargers(), ...cases(), ...glasses()];
}
