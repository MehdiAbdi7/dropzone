// Les formes des réponses de l'API, telles que le front les utilise.

export type ProductKind = "phone" | "tablet" | "laptop" | "watch" | "accessory" | "audiovisual";
export type Condition = "new" | "refurbished";
export type ProductStatus = "draft" | "published";
export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
export type Role = "customer" | "admin";
export type Options = Record<string, string>;

type Pagination = { page: number; limit: number; total: number; pages: number };
export type Page<T> = { data: T[]; pagination: Pagination };

// Une marque telle que la Boutique la voit : seulement celles qui ont des produits publiés.
export type Brand = {
  name: string;
  slug: string;
  logoUrl: string | null;
  productCount: number;
  // Un type d'accessoires (Chargeurs) : ses marques (Apple, Samsung, Anker) qui ont des produits
  // publiés, et le nombre de produits publiés sans marque (la carte « Autres »). Absents d'une
  // réponse mise en cache avant l'étape marque (12/11), vides pour une marque d'appareils.
  makers?: Maker[];
  withoutMaker?: number;
};

// Une marque d'accessoires telle que la Boutique la voit : seulement celles qui ont des produits publiés.
export type Maker = { name: string; slug: string; logoUrl: string | null; productCount: number };

// Une photo de la composition d'une catégorie : sa place en % du cadre 5:4, comme sur le socle
// de l'accueil (null : la place de départ, choisie par le front).
export type CategoryPhoto = {
  slot: string;
  url: string;
  x: number | null;
  y: number | null;
  w: number | null;
  z: number | null;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  kind: ProductKind;
  productCount: number;
  brands: Brand[];
  // Des produits publiés sans marque : la Boutique ajoute une carte « Autres ».
  hasUnbranded: boolean;
  // La catégorie mise en avant sur l'accueil : une seule, calculée par l'API (11/11).
  featured: boolean;
  minPrice: number | null;
  // La composition de photos réglée dans Personnalisation (vide si rien n'est réglé), et la photo
  // du produit le plus récent, pour une catégorie sans composition.
  photos: CategoryPhoto[];
  fallbackImage: string | null;
};

export type ProductCard = {
  id: number;
  // Présents pour les cartes des derniers arrivages, qui représentent une variante précise.
  arrivalVariantId?: number;
  arrivalColor?: string | null;
  name: string;
  slug: string;
  minPrice: number;
  brand: string | null;
  image: string | null;
  category: { name: string; slug: string };
  inStock: boolean;
  hasNew: boolean;
  hasRefurbished: boolean;
  // Le prix le plus bas en stock de chaque état (null s'il n'y en a pas) et ce qui reste.
  newFrom: number | null;
  refurbishedFrom: number | null;
  newStock: number;
  refurbishedCount: number;
};

export type Gift = {
  sku: string;
  name: string;
  options: Options;
  price: number;
  quantity: number;
  image: string | null;
  available: boolean;
};

export type Variant = {
  sku: string;
  options: Options;
  price: number;
  stock: number;
  condition: Condition;
  grade: number | null;
  batteryHealth: number | null;
  replacedParts: string[];
  // Les pièces changées qui ne sont pas d'origine (les autres le sont).
  compatibleParts: string[];
  defects: string[];
  limitations: string[];
  // Une affaire : avec ou sans sa boîte d'origine (null pour un neuf scellé, ou pour une
  // affaire importée dont l'annonce n'en parlait pas), et les détails du gérant.
  withBox: boolean | null;
  details: string | null;
  // Facultatifs exprès : une réponse mise en cache avant le vrai catalogue (partie B)
  // ne les a pas. La garantie en mois, l'origine (« Europe ») et la référence du magasin.
  warrantyMonths?: number | null;
  origin?: string | null;
  reference?: string | null;
  gifts: Gift[];
  // Les téléphones de cette variante d'accessoire (une taille de verre, 12/11) ; vide sinon.
  compatibleModels?: ModelRef[];
};

type ModelRef = { brand: string; name: string; slug: string };

export type ProductDetail = {
  id: number;
  name: string;
  slug: string;
  description: string;
  specs: Options;
  minPrice: number;
  category: { name: string; slug: string; kind: ProductKind };
  // La marque de la Boutique, pour le fil d'Ariane ; null = rangé dans « Autres ».
  brand: { name: string; slug: string } | null;
  // La marque d'un accessoire (Anker), pour le fil d'Ariane ; absente ou null sans marque.
  maker?: { name: string; slug: string } | null;
  deviceModel: ModelRef | null;
  // La série du modèle, pour le fil d'Ariane ; null = pas de série (accessoire, modèle non rangé).
  series: { name: string; slug: string } | null;
  compatibleModels: ModelRef[];
  images: { id: number; url: string }[];
  variants: Variant[];
  // La lueur choisie pour le modèle (affiche Neuf / Affaire sans couleur) ; null sans modèle.
  posterColor: string | null;
  // Les couleurs du modèle, dans leur ordre, avec leur photo (étape Couleur) ; [] sans modèle.
  colors: { name: string; photoUrl: string | null }[];
};

// ---------- Le catalogue des accessoires (refonte du 12/11) ----------

// Un accessoire tel que la page Accessoires le montre : sa carte, et de quoi la filtrer.
export type AccessoryItem = {
  name: string;
  slug: string;
  image: string | null;
  // Le slug de son type (Chargeurs, Coques…).
  type: string;
  // Sa marque dans le type (Anker), null sans marque (les verres incassables).
  maker: { name: string; slug: string } | null;
  // Le prix le plus bas en stock, sinon le plus bas tout court.
  minPrice: number;
  // Les variantes n'ont pas toutes le même prix : la carte écrit « dès ».
  hasRange: boolean;
  inStock: boolean;
  // Les valeurs de chaque option, dans l'ordre des variantes : la ligne d'aide de la carte.
  options: Record<string, string[]>;
};

// `GET /accessories/:category` : les types (avec leurs marques) et tous les accessoires publiés.
export type AccessoryCatalog = {
  category: { name: string; slug: string };
  types: { name: string; slug: string; makers: { name: string; slug: string; logoUrl: string | null }[] }[];
  products: AccessoryItem[];
};

// ---------- Les affiches de séries ----------

// Une affiche de la page « choisis ta série ».
export type SeriesSummary = {
  name: string;
  slug: string;
  coverUrl: string | null;
  // Tous les modèles de la série, dans l'ordre de l'affiche, ceux pas encore en vente compris.
  models: string[];
  // Le plus bas en stock, neuf scellé ou affaire ; null = série épuisée.
  fromPrice: number | null;
  soldOut: boolean;
  // De quoi faire l'affiche de secours sans couverture : photo et couleur du premier modèle.
  fallback: { image: string | null; color: string | null };
};

// Les séries d'une marque, dans `GET /series?category=` sans marque (12/11) : la Boutique en
// reçoit toutes les marques d'un coup et passe de l'une à l'autre sans nouvel appel.
export type BrandSeries = {
  brand: { name: string; slug: string; logoUrl: string | null };
  series: SeriesSummary[];
};

// Une colonne de l'affiche d'une série. Un modèle sans fiche publiée y est aussi, grisé :
// `onSale` faux, pas de `productSlug` (donc pas de lien), ni photo, ni prix.
export type PosterModel = {
  name: string;
  productSlug: string | null;
  onSale: boolean;
  image: string | null;
  specs: [string, string][];
  // Les couleurs officielles du modèle dans le monde, sans rapport avec le stock (le stock
  // par couleur est sur la page Neuf scellé).
  colors: string[];
  newFrom: number | null;
  dealFrom: number | null;
  soldOut: boolean;
  // La lueur choisie par le gérant parmi `colors`, sinon la première (null = lueur neutre).
  posterColor: string | null;
};

export type SeriesPoster = {
  name: string;
  slug: string;
  category: { name: string; slug: string };
  brand: { name: string; slug: string };
  models: PosterModel[];
};

export type CartItem = { sku: string; quantity: number };

export type CartLine = {
  sku: string;
  productId: number;
  name: string;
  slug: string;
  image: string | null;
  options: Options;
  condition: Condition;
  conditionReport: string | null;
  // La garantie en mois (null pour un accessoire ; absente d'une réponse en cache).
  warrantyMonths?: number | null;
  unitPrice: number;
  normalPrice: number;
  quantity: number;
  maxQuantity: number;
  lineTotal: number;
  isGift: boolean;
  giftFor: string | null;
  problem: string | null;
};

export type CartPreview = {
  lines: CartLine[];
  unavailable: string[];
  notices: string[];
  limitations: { sku: string; name: string; limitations: string[] }[];
  subtotal: number;
  shippingFee: number;
  total: number;
  canOrder: boolean;
  cartHash: string;
};

type OrderItem = {
  sku: string;
  name: string;
  options: Options;
  condition: Condition;
  conditionReport: string | null;
  // La garantie au jour de la commande (null pour un accessoire ou une commande d'avant).
  warrantyMonths?: number | null;
  unitPrice: number;
  quantity: number;
  isGift: boolean;
  product?: { slug: string } | null;
};

export type OrderDetail = {
  number: number;
  status: OrderStatus;
  createdAt: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  wilaya: string;
  commune: string;
  fullName?: string;
  phone?: string;
  address?: string;
  note?: string | null;
  items: OrderItem[];
};

export type OrderSummary = {
  number: number;
  status: OrderStatus;
  createdAt: string;
  total: number;
  _count: { items: number };
};

export type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  addressWilaya: string | null;
  addressCommune: string | null;
  addressLine: string | null;
  createdAt: string;
};

export type ApiError = { status: number; data?: { error?: { message?: string; details?: unknown } } };
