import { z } from "zod";
import { isLibraryLogo } from "../../config/brandLogos.js";

const name = z.string().trim().min(1).max(40);

export const accessoryMakerBodySchema = z.object({ name });

export const accessoryMakerPatchSchema = z.object({
  name: name.optional(),
  position: z.number().int().min(0).max(999).optional(),
  // Un logo choisi vient de la bibliothèque ; un logo à soi passe par l'envoi d'image.
  logoUrl: z
    .string()
    .refine(isLibraryLogo, { error: "Choisissez un logo de la bibliothèque" })
    .nullable()
    .optional(),
});
export type AccessoryMakerPatch = z.infer<typeof accessoryMakerPatchSchema>;

// /accessories/:category : le slug de la catégorie d'accessoires, dans l'adresse de la Boutique.
export const accessoryCatalogParamsSchema = z.object({
  category: z.string().trim().min(1).max(120),
});
