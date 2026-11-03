import type { Condition, Options, ProductKind, ProductStatus } from "@/types/api";
import type { AdminProduct, ProductBody } from "../adminApi";

// L'état du formulaire produit. Les nombres restent en texte tant qu'on tape
// (un champ vide n'est pas 0) et sont convertis à l'envoi.
export type VariantDraft = {
  key: string; // identifiant local pour la liste React (une nouvelle variante n'a pas encore d'id)
  id?: number;
  sku: string;
  condition: Condition;
  options: Options;
  price: string;
  stock: string;
  grade: string;
  batteryHealth: string;
  replacedParts: string[];
  defects: string[];
  limitations: string[];
  // L'affaire : posée par le gérant ; détails et cadeaux n'existent qu'avec elle.
  isDeal: boolean;
  dealNote: string;
  gifts: { giftVariantId: number; quantity: number }[];
};

export type ProductDraft = {
  name: string;
  description: string;
  categoryId: number | null;
  deviceModelId: number | null;
  brandId: number | null;
  compatibleModelIds: number[];
  specs: { key: string; value: string }[];
  status: ProductStatus;
  variants: VariantDraft[];
};

let counter = 0;
export const newKey = () => `v${Date.now()}-${counter++}`;

export function emptyVariant(condition: Condition = "new"): VariantDraft {
  return {
    key: newKey(),
    sku: "",
    condition,
    options: {},
    price: "",
    stock: condition === "refurbished" ? "1" : "",
    grade: "",
    batteryHealth: "",
    replacedParts: [],
    defects: [],
    limitations: [],
    isDeal: false,
    dealNote: "",
    gifts: [],
  };
}

export function emptyDraft(): ProductDraft {
  return {
    name: "",
    description: "",
    categoryId: null,
    deviceModelId: null,
    brandId: null,
    compatibleModelIds: [],
    specs: [],
    status: "draft",
    variants: [emptyVariant()],
  };
}

// Un produit de l'API → l'état du formulaire (modification).
export function draftFromProduct(product: AdminProduct): ProductDraft {
  return {
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    deviceModelId: product.deviceModelId,
    brandId: product.brandId,
    compatibleModelIds: product.compatibleModels.map((model) => model.id),
    specs: Object.entries(product.specs).map(([key, value]) => ({ key, value })),
    status: product.status,
    variants: product.variants.map((variant) => ({
      key: newKey(),
      id: variant.id,
      sku: variant.sku,
      condition: variant.condition,
      options: variant.options,
      price: String(variant.price),
      stock: String(variant.stock),
      grade: variant.grade === null ? "" : String(variant.grade),
      batteryHealth: variant.batteryHealth === null ? "" : String(variant.batteryHealth),
      replacedParts: variant.replacedParts,
      defects: variant.defects,
      limitations: variant.limitations,
      isDeal: variant.isDeal,
      dealNote: variant.dealNote ?? "",
      gifts: variant.gifts,
    })),
  };
}

const toNumber = (value: string) => (value.trim() === "" ? Number.NaN : Number(value));
const toNullable = (value: string) => (value.trim() === "" ? null : Number(value));

// L'état du formulaire → le corps envoyé à l'API. Le serveur revérifie tout.
export function bodyFromDraft(draft: ProductDraft): ProductBody {
  return {
    name: draft.name,
    description: draft.description,
    categoryId: draft.categoryId ?? 0,
    deviceModelId: draft.deviceModelId,
    brandId: draft.brandId,
    compatibleModelIds: draft.compatibleModelIds,
    specs: Object.fromEntries(
      draft.specs.filter((row) => row.key.trim() && row.value.trim()).map((row) => [row.key.trim(), row.value.trim()]),
    ),
    status: draft.status,
    variants: draft.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      condition: variant.condition,
      // Une option non choisie n'est pas envoyée.
      options: Object.fromEntries(Object.entries(variant.options).filter(([, value]) => value)),
      price: toNumber(variant.price),
      stock: toNumber(variant.stock),
      grade: toNullable(variant.grade),
      batteryHealth: toNullable(variant.batteryHealth),
      replacedParts: variant.replacedParts,
      defects: variant.defects,
      limitations: variant.limitations,
      isDeal: variant.isDeal,
      // Un champ vide part tel quel : l'API le range comme « pas de détails » (null).
      dealNote: variant.dealNote,
      gifts: variant.gifts,
    })),
  };
}

// Une référence proposée : le modèle en majuscules, les options, puis un numéro
// pour un reconditionné. « iPhone 15 Pro Max », 256 Go, Noir → IPHONE15PROMAX-256GO-NOIR-R-1
export function suggestSku(base: string, variant: VariantDraft, index: number): string {
  const clean = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "");
  const parts = [clean(base).slice(0, 16), ...Object.values(variant.options).map((value) => clean(value).slice(0, 8))];
  if (variant.condition === "refurbished") {
    parts.push(`R${index + 1}`);
  }
  return parts.filter(Boolean).join("-").slice(0, 40);
}

export const isDeviceKind = (kind: ProductKind | undefined) =>
  kind === "phone" || kind === "laptop" || kind === "watch";
