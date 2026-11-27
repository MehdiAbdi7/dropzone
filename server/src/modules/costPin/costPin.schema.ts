import { z } from "zod";

// Quatre chiffres, ni plus ni moins : le code est tapé au pavé numérique, sur téléphone surtout.
export const costPinBodySchema = z.object({
  pin: z.string({ error: "Le code : 4 chiffres" }).regex(/^\d{4}$/, { error: "Le code : 4 chiffres" }),
});
