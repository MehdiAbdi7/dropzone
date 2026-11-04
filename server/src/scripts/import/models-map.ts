// La correspondance entre les noms du relevé Instagram (le `modelKey` de listing.ts) et
// les modèles de la base (`device_models`). Vérifiée à la main, nom par nom.
//
// Règles :
// - un modèle déjà dans device-models.ts garde son nom et son année exacts ;
// - un nouveau suit les mêmes conventions (sans le fabricant pour Apple et Samsung) ;
// - l'année est celle de l'annonce du modèle par son fabricant, ou null quand elle n'est
//   pas sûre (une gamme sans génération, « TUF Gaming F17 ») : le modèle passe en fin de liste ;
// - quand l'annonce ne nomme pas la génération mais que son processeur la désigne sans doute
//   possible (ThinkPad X1 Carbon avec un i7-1265U : Gen 10), c'est cette génération.

export const MAKERS = [
  "Apple", "Samsung", "Honor", "Vivo", "Huawei", "Dell", "HP", "Lenovo", "Asus", "Acer",
  "Microsoft", "MSI", "Gigabyte", "Toshiba",
] as const;

type Entry = { maker: (typeof MAKERS)[number]; name: string; year: number | null };

const m = (maker: Entry["maker"], name: string, year: number | null): Entry => ({ maker, name, year });

export const MODEL_MAP: Record<string, Entry> = {
  // ---------- Téléphones ----------
  "iPhone XR": m("Apple", "iPhone XR", 2018),
  "iPhone 11": m("Apple", "iPhone 11", 2019),
  "iPhone 11 Pro": m("Apple", "iPhone 11 Pro", 2019),
  "iPhone 12 Pro Max": m("Apple", "iPhone 12 Pro Max", 2020),
  "iPhone 13": m("Apple", "iPhone 13", 2021),
  "iPhone 13 Pro": m("Apple", "iPhone 13 Pro", 2021),
  "iPhone 14 Pro Max": m("Apple", "iPhone 14 Pro Max", 2022),
  "iPhone 15": m("Apple", "iPhone 15", 2023),
  "iPhone 15 Pro Max": m("Apple", "iPhone 15 Pro Max", 2023),
  "iPhone 16": m("Apple", "iPhone 16", 2024),
  "iPhone 16 Pro": m("Apple", "iPhone 16 Pro", 2024),
  "iPhone 16 Pro Max": m("Apple", "iPhone 16 Pro Max", 2024),
  "iPhone 17": m("Apple", "iPhone 17", 2025),
  "iPhone 17 Pro Max": m("Apple", "iPhone 17 Pro Max", 2025),
  "Galaxy A15": m("Samsung", "Galaxy A15", 2023),
  "Galaxy A55": m("Samsung", "Galaxy A55", 2024),
  "Galaxy A56": m("Samsung", "Galaxy A56", 2025),
  "Galaxy S21 Ultra": m("Samsung", "Galaxy S21 Ultra", 2021),
  "Galaxy S22+": m("Samsung", "Galaxy S22+", 2022),
  "Galaxy S23": m("Samsung", "Galaxy S23", 2023),
  "Galaxy S23 Ultra": m("Samsung", "Galaxy S23 Ultra", 2023),
  "Galaxy S24": m("Samsung", "Galaxy S24", 2024),
  "Galaxy S24 Ultra": m("Samsung", "Galaxy S24 Ultra", 2024),
  "Galaxy S25 Ultra": m("Samsung", "Galaxy S25 Ultra", 2025),
  "Galaxy XCover 7": m("Samsung", "Galaxy XCover7", 2024),
  "Honor 200": m("Honor", "Honor 200", 2024),
  "Honor Magic 8 Pro": m("Honor", "Magic8 Pro", 2025),
  "Huawei P30 Pro": m("Huawei", "P30 Pro", 2019),
  "Vivo X200 Ultra": m("Vivo", "X200 Ultra", 2025),

  // ---------- Tablettes ----------
  "iPad 10e génération (2022)": m("Apple", "iPad (10e génération)", 2022),
  "iPad A16 (2025)": m("Apple", "iPad (A16)", 2025),
  "iPad mini 6": m("Apple", "iPad mini (6e génération)", 2021),
  "iPad Air 11 M2 (2024)": m("Apple", "iPad Air 11 pouces (M2)", 2024),
  "iPad Pro 12,9 (2020, 4e gén.)": m("Apple", "iPad Pro 12,9 pouces (4e génération)", 2020),
  "Galaxy Tab S10 Ultra": m("Samsung", "Galaxy Tab S10 Ultra", 2024),
  "Galaxy Tab S11": m("Samsung", "Galaxy Tab S11", 2025),

  // ---------- PC portables : Apple ----------
  "Apple MacBook Air 13,3 (2018)": m("Apple", "MacBook Air 13 pouces Intel (2018)", 2018),
  "Apple MacBook Air 13,3 (2020, Intel)": m("Apple", "MacBook Air 13 pouces Intel (2020)", 2020),
  "Apple MacBook Air 13,3 M1 (2020)": m("Apple", "MacBook Air 13 pouces M1", 2020),
  "Apple MacBook Air 13,6 M2 (2022)": m("Apple", "MacBook Air 13 pouces M2", 2022),
  "Apple MacBook Air 13,6 M3 (2024)": m("Apple", "MacBook Air 13 pouces M3", 2024),
  "Apple MacBook Air 13,6 M4 (2025)": m("Apple", "MacBook Air 13 pouces M4", 2025),
  "Apple MacBook Pro 13 (2017)": m("Apple", "MacBook Pro 13 pouces Intel (2017)", 2017),
  "Apple MacBook Pro 13,3 (2020, Intel)": m("Apple", "MacBook Pro 13 pouces Intel (2020)", 2020),
  "Apple MacBook Pro 13,3 M1 (2020)": m("Apple", "MacBook Pro 13 pouces M1", 2020),
  "Apple MacBook Pro 13,3 M2 (2022)": m("Apple", "MacBook Pro 13 pouces M2", 2022),
  // L'annonce dit 2024, mais Apple a sorti le MacBook Pro 14 pouces M3 en novembre 2023.
  "Apple MacBook Pro 14 M3 (2024)": m("Apple", "MacBook Pro 14 pouces M3", 2023),
  "Apple MacBook Pro 14 M3 Pro (2024)": m("Apple", "MacBook Pro 14 pouces M3 Pro", 2023),
  "Apple MacBook Pro 15 (2018)": m("Apple", "MacBook Pro 15 pouces Intel (2018)", 2018),
  "Apple MacBook Pro 16 M1 Pro (2021)": m("Apple", "MacBook Pro 16 pouces M1 Pro", 2021),
  "Apple MacBook Pro 16 M4 Max (2024)": m("Apple", "MacBook Pro 16 pouces M4 Max", 2024),

  // ---------- PC portables : Dell ----------
  "Dell Latitude 3540": m("Dell", "Latitude 3540", 2023),
  "Dell Latitude 5350 2-in-1": m("Dell", "Latitude 5350 2-in-1", null),
  "Dell Latitude 5440": m("Dell", "Latitude 5440", 2023),
  "Dell Latitude 5540": m("Dell", "Latitude 5540", 2023),
  "Dell Latitude 7350": m("Dell", "Latitude 7350", 2024),
  "Dell Latitude 7400": m("Dell", "Latitude 7400", 2019),
  "Dell Latitude 7440": m("Dell", "Latitude 7440", 2023),
  "Dell Precision 3490": m("Dell", "Precision 3490", 2024),
  "Dell Precision 3561": m("Dell", "Precision 3561", 2021),
  "Dell Precision 3571": m("Dell", "Precision 3571", 2022),
  "Dell Precision 3581": m("Dell", "Precision 3581", 2023),
  "Dell Precision 5560": m("Dell", "Precision 5560", 2021),
  "Dell Precision 5680": m("Dell", "Precision 5680", 2023),
  "Dell Precision 5690": m("Dell", "Precision 5690", 2024),
  "Dell Precision 7560": m("Dell", "Precision 7560", 2021),
  "Dell Pro 13 Plus PB13250 2-in-1": m("Dell", "Pro 13 Plus 2-in-1", 2025),
  "Dell Pro 13 Premium": m("Dell", "Pro 13 Premium", 2025),
  "Dell Pro 14 Plus": m("Dell", "Pro 14 Plus", 2025),
  "Dell Pro 16": m("Dell", "Pro 16", 2025),
  "Dell Pro 16 Plus": m("Dell", "Pro 16 Plus", 2025),
  "Dell Pro Max 16 MC16250": m("Dell", "Pro Max 16", 2025),
  "Dell XPS 13 9310": m("Dell", "XPS 13 9310", 2020),
  "Dell XPS 15 9500": m("Dell", "XPS 15 9500", 2020),

  // ---------- PC portables : HP ----------
  "HP 250 G10": m("HP", "250 G10", 2023),
  "HP Elite Dragonfly Chromebook 2-in-1": m("HP", "Elite Dragonfly Chromebook", 2022),
  // Un i7-1165G7 (11e génération) : l'Elite Dragonfly G2.
  "HP EliteBook Dragonfly 2-in-1": m("HP", "Elite Dragonfly G2", 2021),
  "HP EliteBook 630 G11": m("HP", "EliteBook 630 G11", 2024),
  "HP EliteBook 640 G11": m("HP", "EliteBook 640 G11", 2024),
  "HP EliteBook 645 G11": m("HP", "EliteBook 645 G11", 2024),
  "HP EliteBook 830 G11": m("HP", "EliteBook 830 G11", 2024),
  "HP EliteBook 840 G7": m("HP", "EliteBook 840 G7", 2020),
  "HP EliteBook 840 G8": m("HP", "EliteBook 840 G8", 2021),
  "HP EliteBook 840 G10": m("HP", "EliteBook 840 G10", 2023),
  "HP EliteBook 840 G11": m("HP", "EliteBook 840 G11", 2024),
  "HP EliteBook 845 G9": m("HP", "EliteBook 845 G9", 2022),
  "HP EliteBook 845 G10": m("HP", "EliteBook 845 G10", 2023),
  "HP EliteBook x360 830 G10": m("HP", "EliteBook x360 830 G10", 2023),
  "HP EliteBook x360 1040 G10": m("HP", "EliteBook x360 1040 G10", 2023),
  "HP OMEN 15 (Ryzen 5 5600H)": m("HP", "OMEN 15", null),
  "HP OMEN 16-wf1039nf": m("HP", "OMEN 16", null),
  "HP OmniBook X Flip 14": m("HP", "OmniBook X Flip 14", 2024),
  "HP Pavilion Gaming 15": m("HP", "Pavilion Gaming 15", null),
  "HP Pavilion x360 2-in-1": m("HP", "Pavilion x360", null),
  // Un i5-1335U (13e génération) : le ProBook 440 G10.
  "HP ProBook 440": m("HP", "ProBook 440 G10", 2023),
  "HP ProBook 450 G9": m("HP", "ProBook 450 G9", 2022),
  "HP ProBook 455 G10": m("HP", "ProBook 455 G10", 2023),
  "HP Victus 15 (Ryzen)": m("HP", "Victus 15", null),
  "HP Victus 15-fa2046nf": m("HP", "Victus 15", null),
  "HP Victus 16": m("HP", "Victus 16", null),
  "HP ZBook Fury 15 G7": m("HP", "ZBook Fury 15 G7", 2020),
  "HP ZBook Power G10": m("HP", "ZBook Power G10", 2023),
  "HP ZBook X G1i 16": m("HP", "ZBook X G1i 16", 2025),

  // ---------- PC portables : Lenovo ----------
  "Lenovo IdeaPad Duet 5i": m("Lenovo", "IdeaPad Duet 5i", null),
  "Lenovo IdeaPad Gaming 3": m("Lenovo", "IdeaPad Gaming 3", null),
  "Lenovo LOQ 15AHP10": m("Lenovo", "LOQ 15AHP10", 2025),
  "Lenovo LOQ 15IAX9E": m("Lenovo", "LOQ 15IAX9E", 2024),
  "Lenovo Legion 5 15IRX10": m("Lenovo", "Legion 5 15IRX10", 2025),
  // Le type de machine 82JU est le Legion 5 15ACH6H (Ryzen 5 5600H, comme l'annonce).
  "Lenovo Legion 5 82JU": m("Lenovo", "Legion 5 15ACH6H", 2021),
  "Lenovo ThinkBook 15": m("Lenovo", "ThinkBook 15", null),
  // L'annonce dit « Gen 3 », mais son Core 5 120U est celui des modèles de 2024 :
  // génération à vérifier avec le gérant.
  "Lenovo ThinkPad L13 2-in-1 Gen 3": m("Lenovo", "ThinkPad L13 2-in-1", null),
  "Lenovo ThinkPad L13 Yoga Gen 4": m("Lenovo", "ThinkPad L13 Yoga Gen 4", 2023),
  "Lenovo ThinkPad P15 Gen 1": m("Lenovo", "ThinkPad P15 Gen 1", 2020),
  // Un i7-10850H : la première génération.
  "Lenovo ThinkPad P17": m("Lenovo", "ThinkPad P17 Gen 1", 2020),
  "Lenovo ThinkPad T14 Gen 2": m("Lenovo", "ThinkPad T14 Gen 2", 2021),
  "Lenovo ThinkPad T14 Gen 5": m("Lenovo", "ThinkPad T14 Gen 5", 2024),
  // Un Core Ultra 7 165U (Meteor Lake) : la Gen 5.
  "Lenovo ThinkPad T14s (Ultra 7)": m("Lenovo", "ThinkPad T14s Gen 5", 2024),
  "Lenovo ThinkPad T14s Gen 3": m("Lenovo", "ThinkPad T14s Gen 3", 2022),
  "Lenovo ThinkPad T14s Gen 6": m("Lenovo", "ThinkPad T14s Gen 6", 2025),
  // i7-1265U et i5-1235U (12e génération) : la Gen 10 ; Core Ultra 7 155U : la Gen 12.
  "Lenovo ThinkPad X1 Carbon": m("Lenovo", "ThinkPad X1 Carbon Gen 10", 2022),
  "Lenovo ThinkPad X1 Carbon (i5-1235U)": m("Lenovo", "ThinkPad X1 Carbon Gen 10", 2022),
  "Lenovo ThinkPad X1 Carbon Gen 10": m("Lenovo", "ThinkPad X1 Carbon Gen 10", 2022),
  "Lenovo ThinkPad X1 Carbon (Ultra 7)": m("Lenovo", "ThinkPad X1 Carbon Gen 12", 2024),
  "Lenovo ThinkPad X1 Carbon (Ultra 7 155U)": m("Lenovo", "ThinkPad X1 Carbon Gen 12", 2024),
  "Lenovo ThinkPad X1 Yoga Gen 6": m("Lenovo", "ThinkPad X1 Yoga Gen 6", 2021),
  "Lenovo ThinkPad X13 Gen 4": m("Lenovo", "ThinkPad X13 Gen 4", 2023),
  "Lenovo Yoga Slim 7 Pro OLED": m("Lenovo", "Yoga Slim 7 Pro OLED", null),
  "Lenovo Yoga Slim 7x": m("Lenovo", "Yoga Slim 7x", 2024),

  // ---------- PC portables : ASUS (fabricant « Asus » dans la base) ----------
  "ASUS E510KA": m("Asus", "E510KA", null),
  "ASUS ExpertBook (Ryzen 5 7535U)": m("Asus", "ExpertBook", null),
  "ASUS ExpertBook (i7-1260P)": m("Asus", "ExpertBook", null),
  "ASUS ExpertBook 14 (Core Ultra 5 226V)": m("Asus", "ExpertBook 14", null),
  "ASUS ExpertBook 15 (i7-1355U)": m("Asus", "ExpertBook 15", null),
  "ASUS ExpertBook BM1403CDA": m("Asus", "ExpertBook BM1403CDA", null),
  "ASUS ROG G17 (RTX 2080)": m("Asus", "ROG G17", null),
  "ASUS ROG Strix G15 G513RW": m("Asus", "ROG Strix G15 G513RW", 2022),
  "ASUS ROG Strix G16 G614JI": m("Asus", "ROG Strix G16", 2023),
  "ASUS ROG Strix GL503V": m("Asus", "ROG Strix GL503V", 2017),
  "ASUS ROG Strix SCAR 15 G533QS": m("Asus", "ROG Strix SCAR 15 G533QS", 2021),
  // Un Ryzen 9 4900HS : le Zephyrus G14 de 2020.
  "ASUS ROG Zephyrus G14": m("Asus", "ROG Zephyrus G14", 2020),
  "ASUS TUF Gaming F17 (RTX 3050)": m("Asus", "TUF Gaming F17", null),
  "ASUS TUF Gaming F17 (i5-11400H)": m("Asus", "TUF Gaming F17", null),
  "ASUS TUF Gaming F17 (i7-12700H)": m("Asus", "TUF Gaming F17", null),
  "ASUS Vivobook 14 (Snapdragon X)": m("Asus", "Vivobook 14", null),
  "ASUS Vivobook 14 (i7-1355U)": m("Asus", "Vivobook 14", null),
  "ASUS Vivobook 14 X1404VA": m("Asus", "Vivobook 14", null),
  "ASUS Vivobook 15": m("Asus", "Vivobook 15", null),
  "ASUS X515E": m("Asus", "Vivobook 15", null),
  "ASUS X515J": m("Asus", "Vivobook 15", null),
  "ASUS Vivobook OLED (Ryzen 7 5800HS)": m("Asus", "Vivobook OLED", null),
  "ASUS ZenBook (GTX 1650 Ti)": m("Asus", "Zenbook", null),
  // Le nom déjà dans la liste des modèles (« ZenBook », l'ancienne écriture d'ASUS).
  "ASUS Zenbook 14 OLED (i9, RTX 3050)": m("Asus", "ZenBook 14 OLED", 2022),
  "ASUS Zenbook 14 OLED UX3402ZA": m("Asus", "ZenBook 14 OLED", 2022),
  "ASUS Zenbook 15 OLED": m("Asus", "Zenbook 15 OLED", null),

  // ---------- PC portables : les autres ----------
  "Acer Aspire 17 A5": m("Acer", "Aspire 17 A5", null),
  "Acer Aspire A515-58P": m("Acer", "Aspire A515-58P", null),
  "Acer Nitro V 16": m("Acer", "Nitro V 16", null),
  "Acer Nitro V15": m("Acer", "Nitro V 15", null),
  "Acer Nitro V15 (RTX 4050)": m("Acer", "Nitro V 15", null),
  "Acer Nitro V15 (RTX 4060)": m("Acer", "Nitro V 15", null),
  "Acer Swift SF514-56T": m("Acer", "Swift SF514-56T", null),
  "Microsoft Surface Laptop 4": m("Microsoft", "Surface Laptop 4", 2021),
  "Microsoft Surface Laptop 5": m("Microsoft", "Surface Laptop 5", 2022),
  "Microsoft Surface Laptop 7": m("Microsoft", "Surface Laptop 7", 2024),
  "Microsoft Surface Laptop for Business 7": m("Microsoft", "Surface Laptop for Business 7", 2024),
  "Microsoft Surface Pro 6": m("Microsoft", "Surface Pro 6", 2018),
  "Microsoft Surface Pro 7+": m("Microsoft", "Surface Pro 7+", 2021),
  "Microsoft Surface Pro 8": m("Microsoft", "Surface Pro 8", 2021),
  "Microsoft Surface Pro 9 5G": m("Microsoft", "Surface Pro 9 5G", 2022),
  // Processeurs Core Ultra 200V : l'édition Intel, sortie en 2025.
  "Microsoft Surface Pro 11e édition for Business": m("Microsoft", "Surface Pro 11 for Business", 2025),
  "Microsoft Surface Pro 12 pouces (Copilot+)": m("Microsoft", "Surface Pro 12 pouces", 2025),
  "MSI GF63 Thin (i7-8750H)": m("MSI", "GF63 Thin", null),
  "MSI GF63 Thin 11SC": m("MSI", "GF63 Thin", null),
  "MSI Modern 14": m("MSI", "Modern 14", null),
  "Gigabyte G5": m("Gigabyte", "G5", null),
  "Honor MagicBook NBD-WXX9": m("Honor", "MagicBook 14", null),
  "Samsung Galaxy Book3": m("Samsung", "Galaxy Book3", 2023),
  "Toshiba Tecra A40": m("Toshiba", "Tecra A40", null),
};

// Les annonces qu'on n'importe pas, avec la raison (affichée dans le rapport de l'import).
export const IGNORED: Record<string, string> = {
  "Apple MacBook Pro « M3 15,4 pouces » (2024) Minuit, à vérifier":
    "format qui n'existe pas chez Apple, à vérifier avec le gérant",
};
