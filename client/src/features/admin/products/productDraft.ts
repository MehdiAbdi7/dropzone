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
  // Pour chaque pièce changée, le choix du gérant. Une pièce absente n'a pas encore
  // été choisie : pas de valeur par défaut, « d'origine » par erreur serait une fausse
  // promesse au client.
  partOrigins: Record<string, PartOrigin>;
  defects: string[];
  limitations: string[];
  // Une affaire : avec ou sans sa boîte d'origine, et les détails pour le client.
  withBox: boolean;
  details: string;
  // Les articles offerts, sur un neuf scellé comme sur une affaire.
  gifts: { giftVariantId: number; quantity: number }[];
};

export type PartOrigin = "origine" | "compatible";

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
    partOrigins: {},
    defects: [],
    limitations: [],
    withBox: false,
    details: "",
    gifts: [],
  };
}

// Les pièces changées d'une affaire dont le gérant n'a pas dit si elles sont d'origine
// ou compatibles : le formulaire refuse l'envoi tant qu'il en reste.
export function missingPartOrigins(variant: VariantDraft): string[] {
  if (variant.condition !== "refurbished") {
    return [];
  }
  return variant.replacedParts.filter((part) => !variant.partOrigins[part]);
}

// Les pièces changées cochées dans le formulaire ; une pièce décochée perd son choix,
// pour qu'elle ne revienne pas « compatible » si on la recoche plus tard.
export function withReplacedParts(variant: VariantDraft, replacedParts: string[]): VariantDraft {
  const partOrigins = Object.fromEntries(
    Object.entries(variant.partOrigins).filter(([part]) => replacedParts.includes(part)),
  );
  return { ...variant, replacedParts, partOrigins };
}

// Un nouveau produit, vide ou prérempli depuis le Catalogue (« Créer la fiche » d'un modèle).
export function emptyDraft(prefill?: { categoryId: number; brandId: number; deviceModelId: number; name: string }): ProductDraft {
  return {
    name: prefill?.name ?? "",
    description: "",
    categoryId: prefill?.categoryId ?? null,
    deviceModelId: prefill?.deviceModelId ?? null,
    brandId: prefill?.brandId ?? null,
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
      // Une pièce enregistrée a déjà été choisie : compatible si elle est dans la liste,
      // sinon d'origine.
      partOrigins: Object.fromEntries(
        variant.replacedParts.map((part) => [part, variant.compatibleParts.includes(part) ? "compatible" : "origine"]),
      ),
      defects: variant.defects,
      limitations: variant.limitations,
      withBox: variant.withBox ?? false,
      details: variant.details ?? "",
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
    variants: draft.variants.map((variant) => {
      const deal = variant.condition === "refurbished";
      return {
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
        // Un neuf scellé n'a ni boîte à dire, ni pièce, ni détails : l'API les refuserait.
        compatibleParts: deal ? variant.replacedParts.filter((part) => variant.partOrigins[part] === "compatible") : [],
        withBox: deal ? variant.withBox : null,
        // Un champ vide part tel quel : l'API le range comme « pas de détails » (null).
        details: deal ? variant.details : "",
        gifts: variant.gifts,
      };
    }),
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
