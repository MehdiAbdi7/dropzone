// Les 4 caractéristiques des téléphones et tablettes importés, d'après les sources du
// fabricant (adresse en commentaire), lues le 04/11/2026. Les annonces de DropZone n'en
// donnent pas : rien ici ne vient d'ailleurs que du fabricant.
// Clé : « Fabricant|Nom » du modèle (models-map.ts).
//
// Les appareils photo comptent les vrais objectifs : le « téléobjectif 2x » des iPhone 15,
// 16 et 17 est un recadrage de la caméra 48 Mpx, pas une caméra de plus.
// Quand la puce change selon le pays, la version européenne d'abord (DropZone vend
// surtout des appareils d'Europe).

type Specs = Record<"Écran" | "Puce" | "Appareil photo" | "Batterie", string>;

const iphone = (screen: string, chip: string, camera: string, hours: number): Specs => ({
  Écran: screen,
  Puce: chip,
  "Appareil photo": camera,
  Batterie: `Jusqu'à ${hours} h de lecture vidéo`,
});

const ipad = (screen: string, chip: string, camera: string): Specs => ({
  Écran: screen,
  Puce: chip,
  "Appareil photo": camera,
  Batterie: "Jusqu'à 10 h de navigation en Wi-Fi ou de vidéo",
});

const device = (screen: string, chip: string, camera: string, battery: string): Specs => ({
  Écran: screen,
  Puce: chip,
  "Appareil photo": camera,
  Batterie: battery,
});

const SUPER_RETINA = "OLED (Super Retina XDR)";

export const OFFICIAL_SPECS: Record<string, Specs> = {
  // ---------- Apple, support.apple.com/fr-fr/<n°> (« Caractéristiques techniques ») ----------
  "Apple|iPhone XR": iphone("6,1 pouces LCD (IPS)", "A12 Bionic", "12 Mpx grand-angle", 16), // 111868
  "Apple|iPhone 11": iphone("6,1 pouces LCD (IPS)", "A13 Bionic", "Double 12 Mpx : grand-angle et ultra grand-angle", 17), // 111865
  "Apple|iPhone 11 Pro": iphone("5,8 pouces OLED", "A13 Bionic", "Triple 12 Mpx : ultra grand-angle, grand-angle et téléobjectif", 18), // 111879
  "Apple|iPhone 12 Pro Max": iphone(`6,7 pouces ${SUPER_RETINA}`, "A14 Bionic", "Triple 12 Mpx : ultra grand-angle, grand-angle et téléobjectif", 20), // 111874
  "Apple|iPhone 13": iphone(`6,1 pouces ${SUPER_RETINA}`, "A15 Bionic", "Double 12 Mpx : grand-angle et ultra grand-angle", 19), // 111872
  "Apple|iPhone 13 Pro": iphone(`6,1 pouces ${SUPER_RETINA}, ProMotion`, "A15 Bionic", "Triple 12 Mpx : téléobjectif, grand-angle et ultra grand-angle", 22), // 111871
  "Apple|iPhone 14 Pro Max": iphone(`6,7 pouces ${SUPER_RETINA}`, "A16 Bionic", "48 Mpx principal, 12 Mpx ultra grand-angle et 12 Mpx téléobjectif 3x", 29), // 111846
  "Apple|iPhone 15": iphone(`6,1 pouces ${SUPER_RETINA}`, "A16 Bionic", "48 Mpx principal et 12 Mpx ultra grand-angle", 20), // 111831
  "Apple|iPhone 15 Pro Max": iphone(`6,7 pouces ${SUPER_RETINA}`, "A17 Pro", "48 Mpx principal, 12 Mpx ultra grand-angle et 12 Mpx téléobjectif 5x", 29), // 111828
  "Apple|iPhone 16": iphone(`6,1 pouces ${SUPER_RETINA}`, "A18", "48 Mpx Fusion et 12 Mpx ultra grand-angle", 22), // 121029
  "Apple|iPhone 16 Pro": iphone(`6,3 pouces ${SUPER_RETINA}`, "A18 Pro", "48 Mpx Fusion, 48 Mpx ultra grand-angle et 12 Mpx téléobjectif 5x", 27), // 121031
  "Apple|iPhone 16 Pro Max": iphone(`6,9 pouces ${SUPER_RETINA}`, "A18 Pro", "48 Mpx Fusion, 48 Mpx ultra grand-angle et 12 Mpx téléobjectif 5x", 33), // 121032
  "Apple|iPhone 17": iphone(`6,3 pouces ${SUPER_RETINA}`, "A19", "48 Mpx Fusion et 48 Mpx Fusion ultra grand-angle", 30), // 125089
  "Apple|iPhone 17 Pro Max": iphone(`6,9 pouces ${SUPER_RETINA}`, "A19 Pro", "Trois caméras Fusion 48 Mpx : principale, ultra grand-angle et téléobjectif 4x", 37), // 125091
  "Apple|iPad (10e génération)": ipad("10,9 pouces Liquid Retina (LCD IPS)", "A14 Bionic", "12 Mpx grand-angle"), // 111840
  "Apple|iPad (A16)": ipad("11 pouces Liquid Retina (LCD IPS)", "A16", "12 Mpx grand-angle"), // 122240
  "Apple|iPad mini (6e génération)": ipad("8,3 pouces Liquid Retina (LCD IPS)", "A15 Bionic", "12 Mpx grand-angle"), // 111886
  "Apple|iPad Air 11 pouces (M2)": ipad("11 pouces Liquid Retina (LCD IPS)", "Apple M2", "12 Mpx grand-angle"), // 119894
  "Apple|iPad Pro 12,9 pouces (4e génération)": ipad("12,9 pouces Liquid Retina (LCD IPS)", "A12Z Bionic", "12 Mpx grand-angle et 10 Mpx ultra grand-angle"), // 111977

  // ---------- Samsung, communiqués de lancement de news.samsung.com et fiches samsung.com ----------
  // samsung.com/ph (SM-A155) : la puce n'y est pas nommée, seulement « Octa-core, 2,2 GHz ».
  "Samsung|Galaxy A15": device("6,5 pouces Super AMOLED", "Octa-core 2,2 GHz", "50 Mpx principal, 5 Mpx ultra grand-angle et 2 Mpx macro", "5 000 mAh"),
  // news.samsung.com/uk/galaxy-a55-5g-… et news.samsung.com/in/… (puce)
  "Samsung|Galaxy A55": device("6,6 pouces Super AMOLED, 120 Hz", "Exynos 1480", "50 Mpx principal, 12 Mpx ultra grand-angle et 5 Mpx macro", "5 000 mAh"),
  // news.samsung.com/fr/samsung-democratise-lia-…-galaxy-a56-5g-…
  "Samsung|Galaxy A56": device("6,7 pouces Super AMOLED, 120 Hz", "Exynos 1580", "50 Mpx principal, 12 Mpx ultra grand-angle et 5 Mpx macro", "5 000 mAh"),
  // news.samsung.com/uk/samsung-galaxy-s21-ultra-5g-…
  "Samsung|Galaxy S21 Ultra": device("6,8 pouces Dynamic AMOLED 2X, 120 Hz", "Exynos 2100", "108 Mpx, 12 Mpx ultra grand-angle et deux téléobjectifs 10 Mpx (3x et 10x)", "5 000 mAh"),
  // news.samsung.com/be_fr/les-samsung-galaxy-s22-et-s22-… et news.samsung.com/fr/galaxy-s22-galaxy-s22plus
  "Samsung|Galaxy S22+": device("6,6 pouces Dynamic AMOLED 2X, 120 Hz", "Exynos 2200 (Europe)", "50 Mpx, 12 Mpx ultra grand-angle et 10 Mpx téléobjectif 3x", "4 500 mAh"),
  // news.samsung.com/us/samsung-new-galaxy-s23-series-… et news.samsung.com/fr/samsung-galaxy-s23-series
  "Samsung|Galaxy S23": device("6,1 pouces Dynamic AMOLED 2X, 120 Hz", "Snapdragon 8 Gen 2 for Galaxy", "50 Mpx, 12 Mpx ultra grand-angle et 10 Mpx téléobjectif 3x", "3 900 mAh"),
  "Samsung|Galaxy S23 Ultra": device("6,8 pouces Dynamic AMOLED 2X, 120 Hz", "Snapdragon 8 Gen 2 for Galaxy", "200 Mpx, 12 Mpx ultra grand-angle et deux téléobjectifs 10 Mpx (3x et 10x)", "5 000 mAh"),
  // news.samsung.com/uk/enter-the-new-era-of-mobile-ai-… ; puce : news.samsung.com/in/galaxy-unpacked-2024-highlights-…
  "Samsung|Galaxy S24": device("6,2 pouces Dynamic AMOLED 2X, 120 Hz", "Exynos 2400 (Snapdragon 8 Gen 3 dans certains pays)", "50 Mpx, 12 Mpx ultra grand-angle et 10 Mpx téléobjectif 3x", "4 000 mAh"),
  "Samsung|Galaxy S24 Ultra": device("6,8 pouces Dynamic AMOLED 2X, 120 Hz", "Snapdragon 8 Gen 3 for Galaxy", "200 Mpx, 12 Mpx ultra grand-angle, téléobjectifs 50 Mpx (5x) et 10 Mpx (3x)", "5 000 mAh"),
  // news.samsung.com/global/unboxing-galaxy-s25-ultra-… et les fiches des communiqués de janvier 2025
  "Samsung|Galaxy S25 Ultra": device("6,9 pouces Dynamic AMOLED 2X, 120 Hz", "Snapdragon 8 Elite for Galaxy", "200 Mpx, 50 Mpx ultra grand-angle, téléobjectifs 50 Mpx (5x) et 10 Mpx (3x)", "5 000 mAh"),
  // news.samsung.com/uk/introducing-the-galaxy-xcover7-… : la puce n'y est pas nommée.
  "Samsung|Galaxy XCover7": device("6,6 pouces TFT, 60 Hz", "Octa-core 6 nm", "50 Mpx", "4 050 mAh, remplaçable"),
  // news.samsung.com/global/galaxy-tab-s10-series-is-samsungs-ai-ready-tablet
  "Samsung|Galaxy Tab S10 Ultra": device("14,6 pouces Dynamic AMOLED 2X, 120 Hz", "MediaTek Dimensity 9300+", "13 Mpx et 8 Mpx ultra grand-angle", "11 200 mAh"),
  // news.samsung.com/global/meet-samsung-galaxy-tab-s11-series-…
  "Samsung|Galaxy Tab S11": device("11 pouces Dynamic AMOLED 2X, 120 Hz", "MediaTek Dimensity 9400+", "13 Mpx", "8 400 mAh"),

  // ---------- Les autres fabricants ----------
  // honor.com/global/phones/honor-200/ et /spec/
  "Honor|Honor 200": device("6,7 pouces OLED, 120 Hz", "Snapdragon 7 Gen 3", "50 Mpx principal, 50 Mpx téléobjectif 2,5x et 12 Mpx ultra grand-angle", "5 200 mAh"),
  // honor.com/global/phones/honor-magic8-pro/spec/ (7 100 mAh) ; honor.com/uk : 6 270 mAh.
  "Honor|Magic8 Pro": device("6,71 pouces OLED, 120 Hz", "Snapdragon 8 Elite Gen 5", "50 Mpx principal, 50 Mpx ultra grand-angle et 200 Mpx téléobjectif 3,7x", "7 100 mAh (6 270 mAh selon le pays)"),
  // consumer.huawei.com/it/phones/p30-pro1/specs/ et consumer.huawei.com/si/phones/p30-pro-back-up/specs/
  "Huawei|P30 Pro": device("6,47 pouces OLED", "Kirin 980", "40 Mpx, 20 Mpx ultra grand-angle et 8 Mpx téléobjectif", "4 200 mAh"),
  // vivo.com.cn/vivo/param/x200ultra
  "Vivo|X200 Ultra": device("6,82 pouces AMOLED, 120 Hz", "Snapdragon 8 Elite", "50 Mpx principal, 50 Mpx ultra grand-angle et 200 Mpx téléobjectif", "6 000 mAh"),
};

// Les modèles dont la page officielle reste introuvable, avec la raison : ils sont
// importés sans caractéristiques. Aucun au 04/11/2026.
export const SPECS_MISSING: Record<string, string> = {};
