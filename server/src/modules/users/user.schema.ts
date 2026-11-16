import { z } from "zod";
import { paginationQuery } from "../../utils/pagination.js";

// La liste des clients du back-office, en lecture seule.
export const customerListQuerySchema = z.object({
  q: z.string().trim().min(1).max(80).optional(),
  ...paginationQuery,
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;

// Réinitialiser le mot de passe d'un client (15/11) : l'admin en choisit un nouveau. Même règle de force qu'à
// l'inscription (8 caractères au minimum, 72 au plus : bcrypt ignore la fin).
export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, { error: "8 caractères au minimum" }).max(72),
});
