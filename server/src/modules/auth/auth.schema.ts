import { z } from "zod";
import { WILAYAS } from "../../config/wilayas.js";
import { phoneSchema } from "../orders/order.schema.js";

const name = z.string().trim().min(2).max(40);
// Un email en minuscules : `Ali@Mail.com` et `ali@mail.com` sont le même compte.
const email = z.string().trim().toLowerCase().pipe(z.email({ error: "Email invalide" }));

export const registerSchema = z.object({
  firstName: name,
  lastName: name,
  email,
  // bcrypt ne lit que les 72 premiers octets : au-delà, la fin serait ignorée.
  password: z.string().min(8, { error: "8 caractères au minimum" }).max(72),
  phone: phoneSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

// Pas de règle de force au login : elle s'applique à l'inscription seulement.
export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(72),
});

// Ni le rôle ni l'email : Zod retire les champs inconnus, ils ne peuvent pas passer.
export const updateMeSchema = z.object({
  firstName: name.optional(),
  lastName: name.optional(),
  phone: phoneSchema.optional(),
  addressWilaya: z.enum(WILAYAS).nullable().optional(),
  addressCommune: z.string().trim().min(2).max(60).nullable().optional(),
  addressLine: z.string().trim().min(5).max(200).nullable().optional(),
});
