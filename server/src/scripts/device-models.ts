// La liste des modèles d'appareils proposée dans le formulaire produit.
// Le back-office permet d'en ajouter d'autres (bouton « Ajouter un modèle »).
type Kind = "phone" | "tablet" | "laptop" | "watch";

// Chaque modèle avec son année de lancement mondial (la Boutique range les modèles
// du plus récent au plus ancien). Pour Xiaomi, l'année de la version globale, celle
// vendue en Algérie, parfois un an après la version chinoise.
const list = (brand: string, kind: Kind, entries: [name: string, year: number][]) =>
  entries.map(([name, releaseYear]) => ({ brand, name, kind, releaseYear }));

export const DEVICE_MODELS = [
  ...list("Apple", "phone", [
    ["iPhone 8", 2017], ["iPhone 8 Plus", 2017], ["iPhone X", 2017], ["iPhone XR", 2018],
    ["iPhone XS", 2018], ["iPhone XS Max", 2018], ["iPhone 11", 2019], ["iPhone 11 Pro", 2019],
    ["iPhone 11 Pro Max", 2019], ["iPhone SE (2e génération)", 2020],
    ["iPhone 12 mini", 2020], ["iPhone 12", 2020], ["iPhone 12 Pro", 2020], ["iPhone 12 Pro Max", 2020],
    ["iPhone 13 mini", 2021], ["iPhone 13", 2021], ["iPhone 13 Pro", 2021], ["iPhone 13 Pro Max", 2021],
    ["iPhone SE (3e génération)", 2022],
    ["iPhone 14", 2022], ["iPhone 14 Plus", 2022], ["iPhone 14 Pro", 2022], ["iPhone 14 Pro Max", 2022],
    ["iPhone 15", 2023], ["iPhone 15 Plus", 2023], ["iPhone 15 Pro", 2023], ["iPhone 15 Pro Max", 2023],
    ["iPhone 16e", 2025], ["iPhone 16", 2024], ["iPhone 16 Plus", 2024], ["iPhone 16 Pro", 2024],
    ["iPhone 16 Pro Max", 2024],
    ["iPhone 17", 2025], ["iPhone Air", 2025], ["iPhone 17 Pro", 2025], ["iPhone 17 Pro Max", 2025],
    ["iPhone 18 Pro", 2026], ["iPhone 18 Pro Max", 2026],
  ]),
  ...list("Samsung", "phone", [
    ["Galaxy S20", 2020], ["Galaxy S20+", 2020], ["Galaxy S20 Ultra", 2020], ["Galaxy S20 FE", 2020],
    ["Galaxy S21", 2021], ["Galaxy S21+", 2021], ["Galaxy S21 Ultra", 2021], ["Galaxy S21 FE", 2022],
    ["Galaxy S22", 2022], ["Galaxy S22+", 2022], ["Galaxy S22 Ultra", 2022],
    ["Galaxy S23", 2023], ["Galaxy S23+", 2023], ["Galaxy S23 Ultra", 2023], ["Galaxy S23 FE", 2023],
    ["Galaxy S24", 2024], ["Galaxy S24+", 2024], ["Galaxy S24 Ultra", 2024], ["Galaxy S24 FE", 2024],
    ["Galaxy S25", 2025], ["Galaxy S25+", 2025], ["Galaxy S25 Ultra", 2025], ["Galaxy S25 Edge", 2025],
    ["Galaxy Z Flip5", 2023], ["Galaxy Z Fold5", 2023], ["Galaxy Z Flip6", 2024], ["Galaxy Z Fold6", 2024],
    ["Galaxy Z Flip7", 2025], ["Galaxy Z Fold7", 2025],
    ["Galaxy A14", 2023], ["Galaxy A15", 2023], ["Galaxy A16", 2024], ["Galaxy A25", 2023],
    ["Galaxy A26", 2025], ["Galaxy A34", 2023], ["Galaxy A35", 2024], ["Galaxy A36", 2025],
    ["Galaxy A54", 2023], ["Galaxy A55", 2024], ["Galaxy A56", 2025],
  ]),
  ...list("Google", "phone", [
    ["Pixel 6", 2021], ["Pixel 6 Pro", 2021], ["Pixel 6a", 2022], ["Pixel 7", 2022], ["Pixel 7 Pro", 2022],
    ["Pixel 7a", 2023], ["Pixel 8", 2023], ["Pixel 8 Pro", 2023], ["Pixel 8a", 2024], ["Pixel 9", 2024],
    ["Pixel 9 Pro", 2024], ["Pixel 9 Pro XL", 2024], ["Pixel 9a", 2025],
    ["Pixel 10", 2025], ["Pixel 10 Pro", 2025], ["Pixel 10 Pro XL", 2025],
  ]),
  ...list("Xiaomi", "phone", [
    ["Xiaomi 13", 2023], ["Xiaomi 13T", 2023], ["Xiaomi 13T Pro", 2023], ["Xiaomi 14", 2024],
    ["Xiaomi 14T", 2024], ["Xiaomi 14T Pro", 2024], ["Xiaomi 15", 2025], ["Xiaomi 15 Ultra", 2025],
    ["Redmi Note 12", 2023], ["Redmi Note 12 Pro", 2023], ["Redmi Note 13", 2024],
    ["Redmi Note 13 Pro", 2024], ["Redmi Note 13 Pro+", 2024], ["Redmi Note 14", 2025],
    ["Redmi Note 14 Pro", 2025], ["Redmi Note 14 Pro+", 2025], ["Poco X6 Pro", 2024], ["Poco F6", 2024],
  ]),
  ...list("Apple", "laptop", [
    ["MacBook Air 13 pouces M1", 2020], ["MacBook Air 13 pouces M2", 2022], ["MacBook Air 15 pouces M2", 2023],
    ["MacBook Air 13 pouces M3", 2024], ["MacBook Air 15 pouces M3", 2024], ["MacBook Air 13 pouces M4", 2025],
    ["MacBook Air 15 pouces M4", 2025], ["MacBook Pro 13 pouces M1", 2020], ["MacBook Pro 13 pouces M2", 2022],
    ["MacBook Pro 14 pouces M1 Pro", 2021], ["MacBook Pro 14 pouces M2 Pro", 2023],
    ["MacBook Pro 14 pouces M3", 2023], ["MacBook Pro 14 pouces M3 Pro", 2023],
    ["MacBook Pro 14 pouces M4", 2024], ["MacBook Pro 14 pouces M4 Pro", 2024],
    ["MacBook Pro 16 pouces M1 Pro", 2021], ["MacBook Pro 16 pouces M2 Pro", 2023],
    ["MacBook Pro 16 pouces M3 Pro", 2023], ["MacBook Pro 16 pouces M4 Pro", 2024],
  ]),
  // XPS 13, XPS 15 et les deux Asus sont des gammes renouvelées chaque année :
  // l'année est celle de la génération la plus courante en reconditionné.
  ...list("Dell", "laptop", [
    ["XPS 13", 2022], ["XPS 15", 2022], ["Latitude 5420", 2021], ["Latitude 5430", 2022],
    ["Latitude 5440", 2023], ["Latitude 7420", 2021], ["Latitude 7430", 2022], ["Latitude 7440", 2023],
    ["Precision 5570", 2022],
  ]),
  ...list("HP", "laptop", [
    ["EliteBook 840 G8", 2021], ["EliteBook 840 G9", 2022], ["EliteBook 840 G10", 2023],
    ["EliteBook 850 G8", 2021], ["ProBook 450 G9", 2022], ["ProBook 450 G10", 2023],
    ["ZBook Firefly 14 G9", 2022],
  ]),
  ...list("Lenovo", "laptop", [
    ["ThinkPad T14 Gen 2", 2021], ["ThinkPad T14 Gen 3", 2022], ["ThinkPad T14 Gen 4", 2023],
    ["ThinkPad X1 Carbon Gen 9", 2021], ["ThinkPad X1 Carbon Gen 10", 2022],
    ["ThinkPad X1 Carbon Gen 11", 2023], ["ThinkPad E14 Gen 4", 2022], ["Legion 5 Gen 7", 2022],
  ]),
  ...list("Microsoft", "laptop", [["Surface Laptop 4", 2021], ["Surface Laptop 5", 2022], ["Surface Laptop 6", 2024]]),
  ...list("Asus", "laptop", [["ZenBook 14 OLED", 2022], ["ROG Strix G16", 2023], ["TUF Gaming F15", 2022]]),
  // Les tablettes, sous les noms d'Apple et de Samsung (catégorie Tablettes, depuis le 04/11).
  ...list("Apple", "tablet", [
    ["iPad (9e génération)", 2021], ["iPad (10e génération)", 2022], ["iPad (A16)", 2025],
    ["iPad mini (6e génération)", 2021], ["iPad mini (A17 Pro)", 2024],
    ["iPad Air 11 pouces (M2)", 2024], ["iPad Air 13 pouces (M2)", 2024],
    ["iPad Air 11 pouces (M3)", 2025], ["iPad Air 13 pouces (M3)", 2025],
    ["iPad Pro 12,9 pouces (4e génération)", 2020], ["iPad Pro 11 pouces (M4)", 2024],
    ["iPad Pro 13 pouces (M4)", 2024],
  ]),
  ...list("Samsung", "tablet", [
    ["Galaxy Tab S9", 2023], ["Galaxy Tab S9 FE", 2023], ["Galaxy Tab S10+", 2024],
    ["Galaxy Tab S10 Ultra", 2024], ["Galaxy Tab S10 FE", 2025], ["Galaxy Tab S11", 2025],
    ["Galaxy Tab S11 Ultra", 2025],
  ]),
  ...list("Apple", "watch", [
    ["Apple Watch SE (2e génération)", 2022], ["Apple Watch Series 7", 2021], ["Apple Watch Series 8", 2022],
    ["Apple Watch Series 9", 2023], ["Apple Watch Series 10", 2024], ["Apple Watch Ultra", 2022],
    ["Apple Watch Ultra 2", 2023],
  ]),
  ...list("Samsung", "watch", [
    ["Galaxy Watch4", 2021], ["Galaxy Watch5", 2022], ["Galaxy Watch5 Pro", 2022], ["Galaxy Watch6", 2023],
    ["Galaxy Watch6 Classic", 2023], ["Galaxy Watch7", 2024], ["Galaxy Watch Ultra", 2024],
  ]),
];

// La teinte de départ des couleurs (pastille et lueur de l'affiche), posée par le seed et
// par l'import ; ensuite, c'est le gérant qui la règle dans Listes. Orange : mesurée sur la
// photo de l'iPhone 17 Pro Max. Une couleur absente d'ici attend sa teinte dans Listes.
export const COLOR_HEX: Record<string, string> = {
  Noir: "#1d1d1f",
  Blanc: "#f5f5f0",
  Bleu: "#3a5f9e",
  Rouge: "#c8102e",
  Vert: "#4b7a5a",
  Rose: "#f2c4ce",
  Violet: "#6e5a8c",
  Jaune: "#f3d65c",
  Argent: "#d9d9de",
  "Gris sidéral": "#535150",
  Minuit: "#232a35",
  "Lumière stellaire": "#ece5d8",
  "Titane naturel": "#bfb6a8",
  "Titane noir": "#3c3c3d",
  "Titane bleu": "#3c4a63",
  "Titane blanc": "#efeee9",
  "Titane gris": "#8a8a87",
  Graphite: "#41424c",
  Bordeaux: "#6b1f2e",
  Glacier: "#cfe3ee",
  Orange: "#f47d3c",
  "Or rose": "#e6c7c2",
};

// Les valeurs des listes à cocher, par liste (`ChoiceGroup`).
export const CHOICES = {
  storage: ["64 Go", "128 Go", "256 Go", "512 Go", "1 To", "2 To"],
  color: [
    "Noir", "Blanc", "Bleu", "Rouge", "Vert", "Rose", "Violet", "Jaune", "Argent", "Gris sidéral",
    "Minuit", "Lumière stellaire", "Titane naturel", "Titane noir", "Titane bleu", "Titane blanc",
    "Titane gris", "Graphite", "Bordeaux", "Glacier",
  ],
  ram: ["4 Go", "6 Go", "8 Go", "12 Go", "16 Go", "18 Go", "24 Go", "32 Go"],
  processor: [
    "Apple M1", "Apple M2", "Apple M3", "Apple M3 Pro", "Apple M4", "Intel Core i5 (11e gén.)",
    "Intel Core i7 (11e gén.)", "Intel Core i5 (12e gén.)", "Intel Core i7 (12e gén.)",
    "Intel Core Ultra 5", "Intel Core Ultra 7", "AMD Ryzen 5", "AMD Ryzen 7",
  ],
  keyboard: ["AZERTY (FR)", "AZERTY (BE)", "QWERTY (US)", "QWERTY (UK)", "QWERTZ (DE)"],
  size: ["40 mm", "41 mm", "42 mm", "44 mm", "45 mm", "46 mm", "49 mm"],
  connectivity: ["GPS", "GPS + Cellular", "Bluetooth", "LTE", "Wi-Fi", "Wi-Fi + Cellular"],
  // Une option de variante : sur un neuf scellé, le client choisit 1 ou 2 SIM.
  sim: ["Double SIM", "Une SIM", "eSIM uniquement"],
  // Remplie par l'import des annonces (`npm run import:dropzone`), telle qu'écrite par DropZone.
  gpu: [],
  // Une information, pas un choix : d'où vient l'appareil (drapeau des annonces).
  origin: ["Europe", "Canada", "Japon", "États-Unis", "Algérie"],
  replaced_part: [
    "Écran", "Batterie", "Caméra arrière", "Caméra avant", "Cache arrière", "Haut-parleur",
    "Connecteur de charge", "Clavier", "Pavé tactile",
  ],
  defect: [
    "Cache arrière fissuré", "Rayures légères sur l'écran", "Rayures sur le cadre", "Coins marqués",
    "Pixel mort", "Usure du repose-poignets",
  ],
  limitation: [
    "Wi-Fi seulement (ne lit pas les cartes SIM)", "Face ID ne fonctionne pas",
    "Touch ID ne fonctionne pas", "Message « Pièce inconnue » dans les réglages",
    "True Tone désactivé", "Paiement sans contact (NFC) indisponible",
  ],
} as const;
