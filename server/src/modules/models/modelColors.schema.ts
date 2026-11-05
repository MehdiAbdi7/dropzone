import { z } from "zod";
import { variantSchema } from "../products/product.schema.js";

export const modelParamsSchema = z.object({ id: z.coerce.number().int().positive() });

// Express décode déjà l'adresse : « Orange%20cosmique » arrive en « Orange cosmique ».
export const colorParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  color: z.string().trim().min(1).max(60),
});

// Un exemplaire ajouté depuis la page d'une couleur : la variante du formulaire produit,
// plus sa couleur (imposée à l'option « Couleur »). Les articles offerts s'ajoutent ensuite
// dans le formulaire produit : ils sont retirés ici.
export const unitBodySchema = variantSchema.and(z.object({ color: z.string().trim().min(1).max(60) }));
export type UnitBody = z.infer<typeof unitBodySchema>;
