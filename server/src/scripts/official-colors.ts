// Les couleurs officielles des téléphones et tablettes, dans le monde, d'après les sources du
// fabricant, lues le 05/11/2026 (décision de Mehdi : l'affiche montre toutes les couleurs du
// modèle, sans rapport avec le stock). Clé : « Fabricant|Nom » du modèle (device_models).
// L'ordre est celui du fabricant : la première couleur donne la lueur par défaut.
//
// Apple : noms français officiels, page « Identification de votre modèle d'iPhone »
// (support.apple.com/fr-fr/108044) et fiches techniques françaises des iPad (SP815, SP850,
// SP884, 119894, 122240). Pour l'iPhone 17, les 17 Pro et les 18 Pro, les deux pages d'Apple
// ne disent pas la même chose (« Aube », « Bleu foncé », « Bourgogne » d'un côté) : on garde
// les fiches techniques (125089, 125090, 148590), qui sont aussi les noms de la page produit.
//
// Samsung : noms officiels mondiaux, en anglais, des communiqués de lancement
// (news.samsung.com), exclusivités de Samsung.com comprises. Samsung France traduit à sa façon
// (« Bleu Nuit » pour Blue Shadow, « Gris » pour Silver Shadow) et ne nomme pas les coloris
// vendus en ligne : seuls les noms mondiaux sont complets. Le préfixe « Awesome » des Galaxy A
// est retiré (« Awesome Iceblue » → « Iceblue »). Pour les Galaxy A, les coloris changent
// selon le pays : c'est l'union des listes officielles trouvées (à vérifier par le gérant).
//
// Honor (honor.com), Huawei (consumer.huawei.com, union des pages Thaïlande et Amérique latine)
// et vivo (vivo.com.cn : 黑Ka, 红圈, 银调, vendu en Chine seulement, nommé ici en français).

const iphone = (...colors: string[]) => colors;

export const OFFICIAL_COLORS: Record<string, string[]> = {
  // ---------- Apple, iPhone ----------
  "Apple|iPhone 8": iphone("Or", "Argent", "Gris sidéral", "(PRODUCT)RED"),
  "Apple|iPhone 8 Plus": iphone("Or", "Argent", "Gris sidéral", "(PRODUCT)RED"),
  "Apple|iPhone X": iphone("Argent", "Gris sidéral"),
  "Apple|iPhone XR": iphone("Noir", "Blanc", "Bleu", "Jaune", "Corail", "(PRODUCT)RED"),
  "Apple|iPhone XS": iphone("Argent", "Gris sidéral", "Or"),
  "Apple|iPhone XS Max": iphone("Argent", "Gris sidéral", "Or"),
  "Apple|iPhone 11": iphone("Violet", "Vert", "Jaune", "Noir", "Blanc", "(PRODUCT)RED"),
  "Apple|iPhone 11 Pro": iphone("Argent", "Gris sidéral", "Or", "Vert nuit"),
  "Apple|iPhone 11 Pro Max": iphone("Argent", "Gris sidéral", "Or", "Vert nuit"),
  "Apple|iPhone SE (2e génération)": iphone("Blanc", "Noir", "(PRODUCT)RED"),
  "Apple|iPhone 12": iphone("Noir", "Blanc", "(PRODUCT)RED", "Vert", "Bleu", "Violet"),
  "Apple|iPhone 12 mini": iphone("Noir", "Blanc", "(PRODUCT)RED", "Vert", "Bleu", "Violet"),
  "Apple|iPhone 12 Pro": iphone("Argent", "Graphite", "Or", "Bleu pacifique"),
  "Apple|iPhone 12 Pro Max": iphone("Argent", "Graphite", "Or", "Bleu pacifique"),
  "Apple|iPhone 13": iphone("(PRODUCT)RED", "Lumière stellaire", "Minuit", "Bleu", "Rose", "Vert"),
  "Apple|iPhone 13 mini": iphone("(PRODUCT)RED", "Lumière stellaire", "Minuit", "Bleu", "Rose", "Vert"),
  "Apple|iPhone 13 Pro": iphone("Graphite", "Or", "Argent", "Bleu alpin", "Vert alpin"),
  "Apple|iPhone 13 Pro Max": iphone("Graphite", "Or", "Argent", "Bleu alpin", "Vert alpin"),
  "Apple|iPhone SE (3e génération)": iphone("(PRODUCT)RED", "Lumière stellaire", "Minuit"),
  "Apple|iPhone 14": iphone("Minuit", "Lumière stellaire", "(PRODUCT)RED", "Bleu", "Mauve", "Jaune"),
  "Apple|iPhone 14 Plus": iphone("Minuit", "Lumière stellaire", "(PRODUCT)RED", "Bleu", "Mauve", "Jaune"),
  "Apple|iPhone 14 Pro": iphone("Argent", "Or", "Noir sidéral", "Violet intense"),
  "Apple|iPhone 14 Pro Max": iphone("Argent", "Or", "Noir sidéral", "Violet intense"),
  "Apple|iPhone 15": iphone("Noir", "Bleu", "Vert", "Jaune", "Rose"),
  "Apple|iPhone 15 Plus": iphone("Noir", "Bleu", "Vert", "Jaune", "Rose"),
  "Apple|iPhone 15 Pro": iphone("Titane noir", "Titane blanc", "Titane bleu", "Titane naturel"),
  "Apple|iPhone 15 Pro Max": iphone("Titane noir", "Titane blanc", "Titane bleu", "Titane naturel"),
  "Apple|iPhone 16": iphone("Noir", "Blanc", "Rose", "Sarcelle", "Outremer"),
  "Apple|iPhone 16 Plus": iphone("Noir", "Blanc", "Rose", "Sarcelle", "Outremer"),
  "Apple|iPhone 16 Pro": iphone("Titane noir", "Titane blanc", "Titane naturel", "Titane sable"),
  "Apple|iPhone 16 Pro Max": iphone("Titane noir", "Titane blanc", "Titane naturel", "Titane sable"),
  "Apple|iPhone 16e": iphone("Noir", "Blanc"),
  "Apple|iPhone 17": iphone("Noir", "Blanc", "Brume", "Sauge", "Lavande"),
  "Apple|iPhone Air": iphone("Noir sidéral", "Blanc nuage", "Or clair", "Bleu ciel"),
  "Apple|iPhone 17 Pro": iphone("Argent", "Orange cosmique", "Bleu intense"),
  "Apple|iPhone 17 Pro Max": iphone("Argent", "Orange cosmique", "Bleu intense"),
  "Apple|iPhone 18 Pro": iphone("Noir", "Argent", "Glacier", "Bordeaux"),
  "Apple|iPhone 18 Pro Max": iphone("Noir", "Argent", "Glacier", "Bordeaux"),

  // ---------- Apple, iPad ----------
  "Apple|iPad Pro 12,9 pouces (4e génération)": ["Argent", "Gris sidéral"],
  "Apple|iPad mini (6e génération)": ["Gris sidéral", "Rose", "Mauve", "Lumière stellaire"],
  "Apple|iPad (10e génération)": ["Argent", "Bleu", "Rose", "Jaune"],
  "Apple|iPad Air 11 pouces (M2)": ["Bleu", "Mauve", "Lumière stellaire", "Gris sidéral"],
  "Apple|iPad (A16)": ["Argent", "Bleu", "Rose", "Jaune"],

  // ---------- Samsung, Galaxy S ----------
  "Samsung|Galaxy S20": ["Cosmic Gray", "Cloud Blue", "Cloud Pink"],
  "Samsung|Galaxy S20+": ["Cosmic Gray", "Cloud Blue", "Cosmic Black"],
  "Samsung|Galaxy S20 Ultra": ["Cosmic Gray", "Cosmic Black"],
  "Samsung|Galaxy S20 FE": ["Cloud Navy", "Cloud Lavender", "Cloud Mint", "Cloud White", "Cloud Red", "Cloud Orange"],
  "Samsung|Galaxy S21": ["Phantom Violet", "Phantom Gray", "Phantom White", "Phantom Pink"],
  "Samsung|Galaxy S21+": ["Phantom Violet", "Phantom Silver", "Phantom Black", "Phantom Gold", "Phantom Red"],
  "Samsung|Galaxy S21 Ultra": ["Phantom Black", "Phantom Silver", "Phantom Titanium", "Phantom Navy", "Phantom Brown"],
  "Samsung|Galaxy S21 FE": ["Olive", "Lavender", "White", "Graphite"],
  "Samsung|Galaxy S22": ["Phantom Black", "Phantom White", "Green", "Pink Gold", "Graphite", "Cream", "Sky Blue", "Violet"],
  "Samsung|Galaxy S22+": ["Phantom Black", "Phantom White", "Green", "Pink Gold", "Graphite", "Cream", "Sky Blue", "Violet"],
  "Samsung|Galaxy S22 Ultra": ["Phantom Black", "Phantom White", "Green", "Burgundy", "Graphite", "Sky Blue", "Red"],
  "Samsung|Galaxy S23": ["Phantom Black", "Cream", "Green", "Lavender", "Graphite", "Lime"],
  "Samsung|Galaxy S23+": ["Phantom Black", "Cream", "Green", "Lavender", "Graphite", "Lime"],
  "Samsung|Galaxy S23 Ultra": ["Phantom Black", "Cream", "Green", "Lavender", "Graphite", "Lime", "Sky Blue", "Red"],
  "Samsung|Galaxy S23 FE": ["Mint", "Cream", "Graphite", "Purple", "Indigo", "Tangerine"],
  "Samsung|Galaxy S24": ["Onyx Black", "Marble Gray", "Cobalt Violet", "Amber Yellow", "Sapphire Blue", "Sandstone Orange", "Jade Green"],
  "Samsung|Galaxy S24+": ["Onyx Black", "Marble Gray", "Cobalt Violet", "Amber Yellow", "Sapphire Blue", "Sandstone Orange", "Jade Green"],
  "Samsung|Galaxy S24 Ultra": [
    "Titanium Gray", "Titanium Black", "Titanium Violet", "Titanium Yellow", "Titanium Blue", "Titanium Orange", "Titanium Green",
  ],
  "Samsung|Galaxy S24 FE": ["Blue", "Graphite", "Gray", "Mint", "Yellow"],
  "Samsung|Galaxy S25": ["Navy", "Silver Shadow", "Icyblue", "Mint", "Blueblack", "Coralred", "Pinkgold"],
  "Samsung|Galaxy S25+": ["Navy", "Silver Shadow", "Icyblue", "Mint", "Blueblack", "Coralred", "Pinkgold"],
  "Samsung|Galaxy S25 Ultra": [
    "Titanium Silverblue", "Titanium Black", "Titanium Whitesilver", "Titanium Gray",
    "Titanium Jetblack", "Titanium Jadegreen", "Titanium Pinkgold",
  ],
  "Samsung|Galaxy S25 Edge": ["Titanium Silver", "Titanium Icyblue", "Titanium Jetblack"],

  // ---------- Samsung, Galaxy Z ----------
  "Samsung|Galaxy Z Flip5": ["Mint", "Graphite", "Cream", "Lavender", "Gray", "Blue", "Green", "Yellow"],
  "Samsung|Galaxy Z Fold5": ["Icy Blue", "Phantom Black", "Cream", "Gray", "Blue"],
  "Samsung|Galaxy Z Flip6": ["Silver Shadow", "Yellow", "Blue", "Mint", "Crafted Black", "White", "Peach"],
  "Samsung|Galaxy Z Fold6": ["Silver Shadow", "Pink", "Navy", "Crafted Black", "White"],
  "Samsung|Galaxy Z Flip7": ["Jetblack", "Blue Shadow", "Coralred", "Mint"],
  "Samsung|Galaxy Z Fold7": ["Blue Shadow", "Silver Shadow", "Jetblack", "Mint"],

  // ---------- Samsung, Galaxy A, XCover et Tab ----------
  "Samsung|Galaxy A14": ["Black", "Silver", "Dark Red", "Light Green"],
  "Samsung|Galaxy A15": ["Blue Black", "Blue", "Light Blue", "Yellow"],
  "Samsung|Galaxy A25": ["Blue Black", "Blue", "Yellow"],
  "Samsung|Galaxy A16": ["Blue Black", "Light Gray", "Gold", "Light Green"],
  "Samsung|Galaxy A34": ["Lime", "Graphite", "Violet", "Silver"],
  "Samsung|Galaxy A54": ["Lime", "Graphite", "Violet", "White"],
  "Samsung|Galaxy A35": ["Iceblue", "Lemon", "Lilac", "Navy"],
  "Samsung|Galaxy A55": ["Iceblue", "Lemon", "Lilac", "Navy"],
  "Samsung|Galaxy A26": ["Black", "White", "Mint", "Peach Pink"],
  "Samsung|Galaxy A36": ["Lavender", "Black", "White", "Lime"],
  "Samsung|Galaxy A56": ["Lightgray", "Graphite", "Olive", "Pink"],
  "Samsung|Galaxy XCover7": ["Black"],
  "Samsung|Galaxy Tab S10 Ultra": ["Moonstone Gray", "Platinum Silver"],
  "Samsung|Galaxy Tab S11": ["Gray", "Silver"],

  // ---------- Honor, Huawei, vivo ----------
  "Honor|Honor 200": ["Moonlight White", "Emerald Green", "Coral Pink", "Black"],
  "Honor|Magic8 Pro": ["Sunrise Gold", "Sky Cyan", "Black"],
  "Huawei|P30 Pro": ["Aurora", "Breathing Crystal", "Amber Sunrise", "Black", "Pearl White", "Misty Lavender"],
  "Vivo|X200 Ultra": ["Noir", "Rouge", "Argent"],
};
