// Les formes des réponses de l'API, telles que le front les utilise.

export type ProductKind = "phone" | "laptop" | "watch" | "accessory" | "audiovisual";
export type Condition = "new" | "refurbished";
export type ProductStatus = "draft" | "published";
export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
export type Role = "customer" | "admin";
export type Options = Record<string, string>;

export type Pagination = { page: number; limit: number; total: number; pages: number };
export type Page<T> = { data: T[]; pagination: Pagination };

// Une marque telle que la Boutique la voit : seulement celles qui ont des produits publiés.
export type Brand = {
  name: string;
  slug: string;
  logoUrl: string | null;
  productCount: number;
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
};

export type ProductCard = {
  id: number;
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
  // Une affaire : avec ou sans sa boîte d'origine (null pour un neuf scellé), et les
  // détails du gérant pour le client.
  withBox: boolean | null;
  details: string | null;
  gifts: Gift[];
};

export type ModelRef = { brand: string; name: string; slug: string };

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
  deviceModel: ModelRef | null;
  // La série du modèle, pour le fil d'Ariane ; null = pas de série (accessoire, modèle non rangé).
  series: { name: string; slug: string } | null;
  compatibleModels: ModelRef[];
  images: { id: number; url: string }[];
  variants: Variant[];
};

// ---------- Les affiches de séries ----------

// Une affiche de la page « choisis ta série ».
export type SeriesSummary = {
  name: string;
  slug: string;
  coverUrl: string | null;
  // Les modèles qui ont un produit publié, dans l'ordre de l'affiche.
  models: string[];
  // Le plus bas en stock, neuf scellé ou affaire ; null = série épuisée.
  fromPrice: number | null;
  soldOut: boolean;
  // De quoi faire l'affiche de secours sans couverture : photo et couleur du premier modèle.
  fallback: { image: string | null; color: string | null };
};

// Une colonne de l'affiche d'une série.
export type PosterModel = {
  name: string;
  productSlug: string;
  image: string | null;
  specs: [string, string][];
  colors: { name: string; inStock: boolean }[];
  newFrom: number | null;
  dealFrom: number | null;
  soldOut: boolean;
  // Le nom de la couleur de la lueur, déjà choisie par l'API (null = lueur neutre).
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

export type OrderItem = {
  sku: string;
  name: string;
  options: Options;
  condition: Condition;
  conditionReport: string | null;
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
