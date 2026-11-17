import { z } from "zod";
import { phoneSchema } from "../orders/order.schema.js";

// Les comptes du personnel (lot 7). Le rôle « customer » n'est jamais proposé : un client s'inscrit seul.
const name = z.string().trim().min(2).max(40);
// Un email en minuscules : `Sami@Mail.com` et `sami@mail.com` sont le même compte.
const email = z.string().trim().toLowerCase().pipe(z.email({ error: "Email invalide" }));
const staffRole = z.enum(["admin", "order_manager", "seller"]);

export const createAccountSchema = z.object({
  firstName: name,
  lastName: name,
  email,
  // Facultatif : le personnel n'a pas besoin d'un numéro. Même règle que partout s'il est donné.
  phone: phoneSchema.optional(),
  role: staffRole,
  // Même règle de force qu'à l'inscription (8 caractères au minimum, 72 au plus : bcrypt ignore la fin).
  password: z.string().min(8, { error: "8 caractères au minimum" }).max(72),
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

// On devient administrateur à la création du compte, jamais par un changement de rôle : sinon un admin
// pourrait rétrograder un autre admin, lui donner un mot de passe, puis le re-promouvoir et connaître le
// mot de passe d'un autre administrateur (revue de sécurité du 17/11). On peut en revanche rétrograder.
export const updateAccountSchema = z
  .object({ role: z.enum(["order_manager", "seller"]).optional(), disabled: z.boolean().optional() })
  .refine((body) => body.role !== undefined || body.disabled !== undefined, { error: "Rien à modifier" });
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const accountPasswordSchema = z.object({
  newPassword: z.string().min(8, { error: "8 caractères au minimum" }).max(72),
});
