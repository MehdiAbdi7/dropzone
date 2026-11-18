import { z } from "zod";

// Les pièces de l'atelier (18/11, étape 1). Les bornes protègent le calcul du prix d'achat moyen : un prix
// de 10 000 000 DA au plus, 10 000 pièces par arrivage, donc aucun dépassement d'entier.
const name = z.string().trim().min(1).max(80);
const price = z.number().int().min(0).max(10_000_000);
const stock = z.number().int().min(0).max(1_000_000);

export const partBodySchema = z.object({
  name,
  purchasePrice: price,
  salePrice: price,
  // Le stock de départ : s'il y en a, il s'écrit comme un arrivage au prix d'achat donné.
  stock: stock.optional(),
});

// Le nom et les prix seulement : le stock ne change que par un arrivage ou une correction.
export const partPatchSchema = z.object({
  name: name.optional(),
  purchasePrice: price.optional(),
  salePrice: price.optional(),
});
export type PartPatch = z.infer<typeof partPatchSchema>;

export const arrivalBodySchema = z.object({
  quantity: z.number().int().min(1).max(10_000),
  // Un arrivage à 0 DA est permis : les pièces récupérées sur un appareil démonté n'ont rien coûté.
  unitCost: price,
});

// Le stock COMPTÉ par l'admin ; l'écart avec l'ancien stock est calculé par le serveur.
export const correctionBodySchema = z.object({
  stock,
  note: z.string().trim().max(200).optional(),
});

export const partSearchQuerySchema = z.object({ q: z.string().trim().max(60).default("") });
export type PartSearchQuery = z.infer<typeof partSearchQuerySchema>;
