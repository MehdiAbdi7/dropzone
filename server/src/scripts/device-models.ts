// La liste des modèles d'appareils proposée dans le formulaire produit.
// Le back-office permet d'en ajouter d'autres (bouton « Ajouter un modèle »).
type Kind = "phone" | "laptop" | "watch";

const list = (brand: string, kind: Kind, names: string[]) =>
  names.map((name) => ({ brand, name, kind }));

export const DEVICE_MODELS = [
  ...list("Apple", "phone", [
    "iPhone 8", "iPhone 8 Plus", "iPhone X", "iPhone XR", "iPhone XS", "iPhone XS Max",
    "iPhone 11", "iPhone 11 Pro", "iPhone 11 Pro Max", "iPhone SE (2e génération)",
    "iPhone 12 mini", "iPhone 12", "iPhone 12 Pro", "iPhone 12 Pro Max",
    "iPhone 13 mini", "iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max", "iPhone SE (3e génération)",
    "iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max",
    "iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max",
    "iPhone 16e", "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max",
    "iPhone 17", "iPhone Air", "iPhone 17 Pro", "iPhone 17 Pro Max",
    "iPhone 18 Pro", "iPhone 18 Pro Max",
  ]),
  ...list("Samsung", "phone", [
    "Galaxy S20", "Galaxy S20+", "Galaxy S20 Ultra", "Galaxy S20 FE",
    "Galaxy S21", "Galaxy S21+", "Galaxy S21 Ultra", "Galaxy S21 FE",
    "Galaxy S22", "Galaxy S22+", "Galaxy S22 Ultra",
    "Galaxy S23", "Galaxy S23+", "Galaxy S23 Ultra", "Galaxy S23 FE",
    "Galaxy S24", "Galaxy S24+", "Galaxy S24 Ultra", "Galaxy S24 FE",
    "Galaxy S25", "Galaxy S25+", "Galaxy S25 Ultra", "Galaxy S25 Edge",
    "Galaxy Z Flip5", "Galaxy Z Fold5", "Galaxy Z Flip6", "Galaxy Z Fold6", "Galaxy Z Flip7", "Galaxy Z Fold7",
    "Galaxy A14", "Galaxy A15", "Galaxy A16", "Galaxy A25", "Galaxy A26",
    "Galaxy A34", "Galaxy A35", "Galaxy A36", "Galaxy A54", "Galaxy A55", "Galaxy A56",
  ]),
  ...list("Google", "phone", [
    "Pixel 6", "Pixel 6 Pro", "Pixel 6a", "Pixel 7", "Pixel 7 Pro", "Pixel 7a",
    "Pixel 8", "Pixel 8 Pro", "Pixel 8a", "Pixel 9", "Pixel 9 Pro", "Pixel 9 Pro XL", "Pixel 9a",
    "Pixel 10", "Pixel 10 Pro", "Pixel 10 Pro XL",
  ]),
  ...list("Xiaomi", "phone", [
    "Xiaomi 13", "Xiaomi 13T", "Xiaomi 13T Pro", "Xiaomi 14", "Xiaomi 14T", "Xiaomi 14T Pro",
    "Xiaomi 15", "Xiaomi 15 Ultra", "Redmi Note 12", "Redmi Note 12 Pro", "Redmi Note 13",
    "Redmi Note 13 Pro", "Redmi Note 13 Pro+", "Redmi Note 14", "Redmi Note 14 Pro",
    "Redmi Note 14 Pro+", "Poco X6 Pro", "Poco F6",
  ]),
  ...list("Apple", "laptop", [
    "MacBook Air 13 pouces M1", "MacBook Air 13 pouces M2", "MacBook Air 15 pouces M2",
    "MacBook Air 13 pouces M3", "MacBook Air 15 pouces M3", "MacBook Air 13 pouces M4",
    "MacBook Air 15 pouces M4", "MacBook Pro 13 pouces M1", "MacBook Pro 13 pouces M2",
    "MacBook Pro 14 pouces M1 Pro", "MacBook Pro 14 pouces M2 Pro", "MacBook Pro 14 pouces M3",
    "MacBook Pro 14 pouces M3 Pro", "MacBook Pro 14 pouces M4", "MacBook Pro 14 pouces M4 Pro",
    "MacBook Pro 16 pouces M1 Pro", "MacBook Pro 16 pouces M2 Pro", "MacBook Pro 16 pouces M3 Pro",
    "MacBook Pro 16 pouces M4 Pro",
  ]),
  ...list("Dell", "laptop", [
    "XPS 13", "XPS 15", "Latitude 5420", "Latitude 5430", "Latitude 5440",
    "Latitude 7420", "Latitude 7430", "Latitude 7440", "Precision 5570",
  ]),
  ...list("HP", "laptop", [
    "EliteBook 840 G8", "EliteBook 840 G9", "EliteBook 840 G10", "EliteBook 850 G8",
    "ProBook 450 G9", "ProBook 450 G10", "ZBook Firefly 14 G9",
  ]),
  ...list("Lenovo", "laptop", [
    "ThinkPad T14 Gen 2", "ThinkPad T14 Gen 3", "ThinkPad T14 Gen 4", "ThinkPad X1 Carbon Gen 9",
    "ThinkPad X1 Carbon Gen 10", "ThinkPad X1 Carbon Gen 11", "ThinkPad E14 Gen 4", "Legion 5 Gen 7",
  ]),
  ...list("Microsoft", "laptop", ["Surface Laptop 4", "Surface Laptop 5", "Surface Laptop 6"]),
  ...list("Asus", "laptop", ["ZenBook 14 OLED", "ROG Strix G16", "TUF Gaming F15"]),
  ...list("Apple", "watch", [
    "Apple Watch SE (2e génération)", "Apple Watch Series 7", "Apple Watch Series 8",
    "Apple Watch Series 9", "Apple Watch Series 10", "Apple Watch Ultra", "Apple Watch Ultra 2",
  ]),
  ...list("Samsung", "watch", [
    "Galaxy Watch4", "Galaxy Watch5", "Galaxy Watch5 Pro", "Galaxy Watch6", "Galaxy Watch6 Classic",
    "Galaxy Watch7", "Galaxy Watch Ultra",
  ]),
];

// Les valeurs des listes à cocher, par liste (`ChoiceGroup`).
export const CHOICES = {
  storage: ["64 Go", "128 Go", "256 Go", "512 Go", "1 To", "2 To"],
  color: [
    "Noir", "Blanc", "Bleu", "Rouge", "Vert", "Rose", "Violet", "Jaune", "Argent", "Gris sidéral",
    "Minuit", "Lumière stellaire", "Titane naturel", "Titane noir", "Titane bleu", "Titane blanc",
    "Titane gris", "Graphite",
  ],
  ram: ["4 Go", "6 Go", "8 Go", "12 Go", "16 Go", "18 Go", "24 Go", "32 Go"],
  processor: [
    "Apple M1", "Apple M2", "Apple M3", "Apple M3 Pro", "Apple M4", "Intel Core i5 (11e gén.)",
    "Intel Core i7 (11e gén.)", "Intel Core i5 (12e gén.)", "Intel Core i7 (12e gén.)",
    "Intel Core Ultra 5", "Intel Core Ultra 7", "AMD Ryzen 5", "AMD Ryzen 7",
  ],
  keyboard: ["AZERTY (FR)", "AZERTY (BE)", "QWERTY (US)", "QWERTY (UK)", "QWERTZ (DE)"],
  size: ["40 mm", "41 mm", "42 mm", "44 mm", "45 mm", "46 mm", "49 mm"],
  connectivity: ["GPS", "GPS + Cellular", "Bluetooth", "LTE"],
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
