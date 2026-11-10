import { z } from "zod";
import { isLibraryLogo } from "../../config/brandLogos.js";

const name = z.string().trim().min(1).max(40);
const makerName = z.string().trim().min(1).max(40).nullable();

export const brandBodySchema = z.object({
  name,
  makerName: makerName.optional(),
});

export const brandPatchSchema = z.object({
  name: name.optional(),
  makerName: makerName.optional(),
  position: z.number().int().min(0).max(999).optional(),
  // Un logo choisi vient de la bibliothèque ; un logo à soi passe par l'envoi d'image.
  logoUrl: z
    .string()
    .refine(isLibraryLogo, { error: "Choisissez un logo de la bibliothèque" })
    .nullable()
    .optional(),
});
export type BrandPatch = z.infer<typeof brandPatchSchema>;
