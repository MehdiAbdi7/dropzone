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
  hasDeal: boolean;
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
  defects: string[];
  limitations: string[];
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
  compatibleModels: ModelRef[];
  images: { id: number; url: string }[];
  variants: Variant[];
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
