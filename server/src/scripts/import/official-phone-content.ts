type PhoneSpecs = {
  Puce: string;
  Écran: string;
  Batterie: string;
  "Appareil photo": string;
  Connecteur: string;
};

type PhoneContent = PhoneSpecs & { source: string };

// Spécifications recoupées sur les pages techniques des fabricants, le 10/11/2026.
// Les autonomies Apple sont les valeurs maximales officielles de lecture vidéo.
const apple = (chip: string, screen: string, batteryHours: number, camera: string, connector: "Lightning" | "USB-C", sourceId: string): PhoneContent => ({
  Puce: chip,
  Écran: screen,
  Batterie: `Jusqu'à ${batteryHours} h de lecture vidéo`,
  "Appareil photo": camera,
  Connecteur: connector,
  source: `https://support.apple.com/en-us/${sourceId}`,
});

const samsung = (
  chip: string,
  screen: string,
  battery: string,
  camera: string,
  source: string,
): PhoneContent => ({
  Puce: chip,
  Écran: screen,
  Batterie: battery,
  "Appareil photo": camera,
  Connecteur: "USB-C",
  source,
});

const samsungNews = "https://news.samsung.com/global/";
export const OFFICIAL_PHONE_CONTENT: Record<string, PhoneContent> = {
  "Apple|iPhone XR": apple("A12 Bionic", "6,1 pouces LCD IPS Liquid Retina HD", 16, "Grand-angle 12 Mpx", "Lightning", "111868"),
  "Apple|iPhone 11": apple("A13 Bionic", "6,1 pouces LCD Liquid Retina HD", 17, "Double 12 Mpx : grand-angle et ultra grand-angle", "Lightning", "111865"),
  "Apple|iPhone 11 Pro": apple("A13 Bionic", "5,8 pouces OLED Super Retina XDR", 18, "Triple 12 Mpx : ultra grand-angle, grand-angle et téléobjectif", "Lightning", "111879"),
  "Apple|iPhone 12": apple("A14 Bionic", "6,1 pouces OLED Super Retina XDR", 17, "Double 12 Mpx : grand-angle et ultra grand-angle", "Lightning", "111876"),
  "Apple|iPhone 12 Pro": apple("A14 Bionic", "6,1 pouces OLED Super Retina XDR", 17, "Triple 12 Mpx : ultra grand-angle, grand-angle et téléobjectif", "Lightning", "111875"),
  "Apple|iPhone 12 Pro Max": apple("A14 Bionic", "6,7 pouces OLED Super Retina XDR", 20, "Triple 12 Mpx : ultra grand-angle, grand-angle et téléobjectif", "Lightning", "111874"),
  "Apple|iPhone 12 mini": apple("A14 Bionic", "5,4 pouces OLED Super Retina XDR", 15, "Double 12 Mpx : grand-angle et ultra grand-angle", "Lightning", "111877"),
  "Apple|iPhone 13": apple("A15 Bionic", "6,1 pouces OLED Super Retina XDR", 19, "Double 12 Mpx : grand-angle et ultra grand-angle", "Lightning", "111872"),
  "Apple|iPhone 13 Pro": apple("A15 Bionic", "6,1 pouces OLED Super Retina XDR avec ProMotion", 22, "Triple 12 Mpx : téléobjectif, grand-angle et ultra grand-angle", "Lightning", "111871"),
  "Apple|iPhone 13 Pro Max": apple("A15 Bionic", "6,7 pouces OLED Super Retina XDR avec ProMotion", 28, "Triple 12 Mpx : téléobjectif, grand-angle et ultra grand-angle", "Lightning", "111870"),
  "Apple|iPhone 13 mini": apple("A15 Bionic", "5,4 pouces OLED Super Retina XDR", 17, "Double 12 Mpx : grand-angle et ultra grand-angle", "Lightning", "111873"),
  "Apple|iPhone 14": apple("A15 Bionic", "6,1 pouces OLED Super Retina XDR", 20, "Double 12 Mpx : principal grand-angle et ultra grand-angle", "Lightning", "111850"),
  "Apple|iPhone 14 Plus": apple("A15 Bionic", "6,7 pouces OLED Super Retina XDR", 26, "Double 12 Mpx : principal grand-angle et ultra grand-angle", "Lightning", "111854"),
  "Apple|iPhone 14 Pro": apple("A16 Bionic", "6,1 pouces OLED Super Retina XDR avec ProMotion", 23, "Triple : principal 48 Mpx, ultra grand-angle 12 Mpx et téléobjectif 12 Mpx", "Lightning", "111849"),
  "Apple|iPhone 14 Pro Max": apple("A16 Bionic", "6,7 pouces OLED Super Retina XDR avec ProMotion", 29, "Triple : principal 48 Mpx, ultra grand-angle 12 Mpx et téléobjectif 12 Mpx", "Lightning", "111846"),
  "Apple|iPhone 15": apple("A16 Bionic", "6,1 pouces OLED Super Retina XDR", 20, "Double : principal 48 Mpx et ultra grand-angle 12 Mpx; télé 2× via le capteur principal", "USB-C", "111831"),
  "Apple|iPhone 15 Plus": apple("A16 Bionic", "6,7 pouces OLED Super Retina XDR", 26, "Double : principal 48 Mpx et ultra grand-angle 12 Mpx; télé 2× via le capteur principal", "USB-C", "111830"),
  "Apple|iPhone 15 Pro": apple("A17 Pro", "6,1 pouces OLED Super Retina XDR avec ProMotion", 23, "Triple : principal 48 Mpx, ultra grand-angle 12 Mpx et téléobjectif 12 Mpx, 3× optique", "USB-C", "111829"),
  "Apple|iPhone 15 Pro Max": apple("A17 Pro", "6,7 pouces OLED Super Retina XDR avec ProMotion", 29, "Triple : principal 48 Mpx, ultra grand-angle 12 Mpx et téléobjectif 12 Mpx, 5× optique", "USB-C", "111828"),
  "Apple|iPhone 16": apple("A18", "6,1 pouces OLED Super Retina XDR", 22, "Double : Fusion principal 48 Mpx et ultra grand-angle 12 Mpx; télé 2× via le capteur principal", "USB-C", "121029"),
  "Apple|iPhone 16 Plus": apple("A18", "6,7 pouces OLED Super Retina XDR", 27, "Double : Fusion principal 48 Mpx et ultra grand-angle 12 Mpx; télé 2× via le capteur principal", "USB-C", "121030"),
  "Apple|iPhone 16 Pro": apple("A18 Pro", "6,3 pouces OLED Super Retina XDR avec ProMotion", 27, "Triple : Fusion principal 48 Mpx, ultra grand-angle 48 Mpx et téléobjectif 12 Mpx, 5× optique", "USB-C", "121031"),
  "Apple|iPhone 16 Pro Max": apple("A18 Pro", "6,9 pouces OLED Super Retina XDR avec ProMotion", 33, "Triple : Fusion principal 48 Mpx, ultra grand-angle 48 Mpx et téléobjectif 12 Mpx, 5× optique", "USB-C", "121032"),
  "Apple|iPhone 16e": apple("A18", "6,1 pouces OLED Super Retina XDR", 26, "Fusion principal 48 Mpx; télé 2× via le capteur", "USB-C", "122208"),
  "Apple|iPhone 17": apple("A19", "6,3 pouces OLED Super Retina XDR avec ProMotion", 30, "Double Fusion : principal 48 Mpx et ultra grand-angle 48 Mpx; télé 2× via le capteur principal", "USB-C", "125089"),
  "Apple|iPhone 17 Pro": apple("A19 Pro", "6,3 pouces OLED Super Retina XDR avec ProMotion", 33, "Triple Fusion : principal, ultra grand-angle et téléobjectif 48 Mpx, télé 4× optique", "USB-C", "125090"),
  "Apple|iPhone 17 Pro Max": apple("A19 Pro", "6,9 pouces OLED Super Retina XDR avec ProMotion", 39, "Triple Fusion : principal, ultra grand-angle et téléobjectif 48 Mpx, télé 4× optique", "USB-C", "125091"),
  "Apple|iPhone Air": apple("A19 Pro", "6,5 pouces OLED Super Retina XDR avec ProMotion", 27, "Fusion principal 48 Mpx; télé 2× via le capteur", "USB-C", "125092"),
  "Apple|iPhone 18 Pro": apple("A20 Pro", "6,3 pouces OLED Super Retina XDR avec ProMotion", 36, "Triple Fusion : principal, ultra grand-angle et téléobjectif 48 Mpx, télé 4× optique", "USB-C", "148590"),
  "Apple|iPhone 18 Pro Max": apple("A20 Pro", "6,9 pouces OLED Super Retina XDR avec ProMotion", 45, "Triple Fusion : principal, ultra grand-angle et téléobjectif 48 Mpx, télé 4× optique", "USB-C", "148591"),

  "Samsung|Galaxy A15": samsung("MediaTek Helio G99 (LTE) ou Dimensity 6100+ (5G)", "6,5 pouces Super AMOLED, 90 Hz", "5 000 mAh", "50 Mpx principal, 5 Mpx ultra grand-angle et 2 Mpx macro", `${samsungNews}samsung-announces-galaxy-a15-and-galaxy-a25-5g`),
  "Samsung|Galaxy A55": samsung("Exynos 1480", "6,6 pouces Super AMOLED, 120 Hz", "5 000 mAh", "50 Mpx principal avec OIS, 12 Mpx ultra grand-angle et 5 Mpx macro", `${samsungNews}samsung-galaxy-a55-5g-and-galaxy-a35-5g-awesome-innovations-and-security-engineered-for-everyone`),
  "Samsung|Galaxy A56": samsung("Exynos 1580", "6,7 pouces Super AMOLED, 120 Hz", "5 000 mAh", "50 Mpx principal avec OIS, 12 Mpx ultra grand-angle et 5 Mpx macro", `${samsungNews}samsung-marks-a-step-forward-with-ai-for-everyone-by-introducing-new-galaxy-a56-5g-galaxy-a36-5g-and-galaxy-a26-5g`),
  "Samsung|Galaxy S21 Ultra": samsung("Exynos 2100 (Europe); Snapdragon 888 selon la région", "6,8 pouces Dynamic AMOLED 2X, jusqu'à 120 Hz adaptatifs", "5 000 mAh", "108 Mpx principal, 12 Mpx ultra grand-angle, téléobjectifs 10 Mpx 3× et 10×", "https://www.samsung.com/uk/smartphones/galaxy-s21-ultra-5g/specs/"),
  "Samsung|Galaxy S22+": samsung("Exynos 2200 (Europe); Snapdragon 8 Gen 1 selon la région", "6,6 pouces Dynamic AMOLED 2X, 120 Hz", "4 500 mAh", "50 Mpx principal, 12 Mpx ultra grand-angle et 10 Mpx téléobjectif 3×", `${samsungNews}samsung-electronics-unveils-galaxy-s22-series`),
  "Samsung|Galaxy S23": samsung("Snapdragon 8 Gen 2 for Galaxy", "6,1 pouces Dynamic AMOLED 2X, 120 Hz adaptatifs", "3 900 mAh", "50 Mpx principal, 12 Mpx ultra grand-angle et 10 Mpx téléobjectif 3×", `${samsungNews}samsung-unveils-galaxy-s23-series-designed-for-a-premium-experience-today-and-beyond`),
  "Samsung|Galaxy S23 Ultra": samsung("Snapdragon 8 Gen 2 for Galaxy", "6,8 pouces Dynamic AMOLED 2X, 120 Hz adaptatifs", "5 000 mAh", "200 Mpx principal, 12 Mpx ultra grand-angle, téléobjectifs 10 Mpx 3× et 10×", `${samsungNews}samsung-unveils-galaxy-s23-series-designed-for-a-premium-experience-today-and-beyond`),
  "Samsung|Galaxy S24": samsung("Exynos 2400 (Europe); Snapdragon 8 Gen 3 for Galaxy selon la région", "6,2 pouces Dynamic AMOLED 2X, 120 Hz adaptatifs", "4 000 mAh", "50 Mpx principal, 12 Mpx ultra grand-angle et 10 Mpx téléobjectif 3×", "https://www.samsung.com/uk/smartphones/galaxy-s24/specs/"),
  "Samsung|Galaxy S24 Ultra": samsung("Snapdragon 8 Gen 3 for Galaxy", "6,8 pouces Dynamic AMOLED 2X, 120 Hz adaptatifs", "5 000 mAh", "200 Mpx principal, 12 Mpx ultra grand-angle, téléobjectifs 50 Mpx 5× et 10 Mpx 3×", "https://www.samsung.com/uk/smartphones/galaxy-s24-ultra/specs/"),
  "Samsung|Galaxy S25": samsung("Snapdragon 8 Elite for Galaxy", "6,2 pouces Dynamic AMOLED 2X, 120 Hz adaptatifs", "4 000 mAh", "50 Mpx principal, 12 Mpx ultra grand-angle et 10 Mpx téléobjectif 3×", "https://www.samsung.com/uk/smartphones/galaxy-s25/specs/"),
  "Samsung|Galaxy S25 Edge": samsung("Snapdragon 8 Elite for Galaxy", "6,7 pouces Dynamic AMOLED 2X, 120 Hz adaptatifs", "3 900 mAh", "200 Mpx principal et 12 Mpx ultra grand-angle", "https://www.samsung.com/uk/smartphones/galaxy-s25-edge/specs/"),
  "Samsung|Galaxy S25 Ultra": samsung("Snapdragon 8 Elite for Galaxy", "6,9 pouces Dynamic AMOLED 2X, 120 Hz adaptatifs", "5 000 mAh", "200 Mpx principal, 50 Mpx ultra grand-angle, téléobjectifs 50 Mpx 5× et 10 Mpx 3×", "https://www.samsung.com/uk/smartphones/galaxy-s25-ultra/specs/"),
  "Samsung|Galaxy S25+": samsung("Snapdragon 8 Elite for Galaxy", "6,7 pouces Dynamic AMOLED 2X, 120 Hz adaptatifs", "4 900 mAh", "50 Mpx principal, 12 Mpx ultra grand-angle et 10 Mpx téléobjectif 3×", "https://www.samsung.com/uk/smartphones/galaxy-s25/specs/"),
  "Samsung|Galaxy XCover7": samsung("MediaTek Dimensity 6100+", "6,6 pouces PLS LCD, 60 Hz", "4 050 mAh, amovible", "50 Mpx principal", `${samsungNews}samsung-galaxy-xcover7-and-galaxy-tab-active5-deliver-next-level-durability-and-productivity`),

  "Honor|Honor 200": {
    Puce: "Snapdragon 7 Gen 3",
    Écran: "6,7 pouces OLED, 120 Hz",
    Batterie: "5 200 mAh typiques (5 100 mAh nominales)",
    "Appareil photo": "50 Mpx principal, 50 Mpx téléobjectif et 12 Mpx ultra grand-angle/macro",
    Connecteur: "USB-C",
    source: "https://www.honor.com/uk/phones/honor-200/spec/",
  },
  "Honor|Magic8 Pro": {
    Puce: "Snapdragon 8 Elite Gen 5",
    Écran: "6,71 pouces OLED, 1–120 Hz adaptatifs",
    Batterie: "7 100 mAh (version mondiale; capacité variable selon le marché)",
    "Appareil photo": "50 Mpx principal, 200 Mpx téléobjectif, 50 Mpx ultra grand-angle et capteur de profondeur 3D",
    Connecteur: "USB-C",
    source: "https://www.honor.com/global/phones/honor-magic8-pro/",
  },
  "Huawei|P30 Pro": {
    Puce: "Kirin 980",
    Écran: "6,47 pouces OLED",
    Batterie: "4 200 mAh",
    "Appareil photo": "40 Mpx principal, 20 Mpx ultra grand-angle et 8 Mpx téléobjectif",
    Connecteur: "USB-C",
    source: "https://consumer.huawei.com/it/phones/p30-pro1/specs/",
  },
  "Vivo|X200 Ultra": {
    Puce: "Snapdragon 8 Elite",
    Écran: "6,82 pouces AMOLED, 1–120 Hz",
    Batterie: "6 000 mAh typiques (5 880 mAh nominales; version Chine)",
    "Appareil photo": "50 Mpx principal 35 mm, 200 Mpx téléobjectif 85 mm et 50 Mpx ultra grand-angle 14 mm",
    Connecteur: "USB-C 3.2 Gen 1",
    source: "https://www.vivo.com.cn/vivo/param/x200ultra",
  },
};

export const phoneDescription = (model: string, specs: PhoneSpecs) =>
  `Fiche du modèle ${model} : puce ${specs.Puce}, écran ${specs.Écran}, bloc photo ${specs["Appareil photo"]}, batterie ${specs.Batterie} et connecteur ${specs.Connecteur}.`;
