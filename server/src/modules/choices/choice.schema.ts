import { z } from "zod";

// Les valeurs des listes à cocher du formulaire produit (stockage, couleurs, pièces
// remplacées, défauts, limitations…). La variante recopie le texte choisi : retirer
// une valeur de la liste ne change aucun produit.
export const choiceGroupSchema = z.enum([
  "storage",
  "color",
  "ram",
  "processor",
  "keyboard",
  "size",
  "connectivity",
  "replaced_part",
  "defect",
  "limitation",
  "sim",
  "gpu",
  "origin",
]);
const kindSchema = z.enum(["phone", "tablet", "laptop", "watch", "accessory", "audiovisual"]);

// La teinte d'une couleur, rangée en minuscules (« #F47D3C » devient « #f47d3c ») :
// la même règle que le CHECK de la base.
const hexSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-f]{6}$/i, { error: "Une teinte s'écrit comme #f47d3c" })
  .transform((hex) => hex.toLowerCase());

// Une nouvelle couleur arrive avec sa teinte (sinon pas de pastille, et une lueur violette
// sur l'affiche) ; les autres listes n'en ont pas.
export const choiceBodySchema = z
  .object({
    group: choiceGroupSchema.optional(),
    listId: z.coerce.number().int().positive().optional(),
    label: z.string().trim().min(1).max(80),
    hex: hexSchema.optional(),
  })
  .superRefine((body, ctx) => {
    if (Boolean(body.group) === Boolean(body.listId)) {
      ctx.addIssue({ code: "custom", path: ["group"], message: "Choisissez une liste" });
    }
    if (body.group === "color" && !body.hex) {
      ctx.addIssue({ code: "custom", path: ["hex"], message: "Choisissez la teinte de la couleur" });
    }
    if (body.group !== "color" && body.hex) {
      ctx.addIssue({ code: "custom", path: ["hex"], message: "Seule une couleur a une teinte" });
    }
  });
export type ChoiceBody = z.infer<typeof choiceBodySchema>;

export const choicePatchSchema = z
  .object({ label: z.string().trim().min(1).max(80).optional(), hex: hexSchema.optional() })
  .refine((body) => body.label !== undefined || body.hex !== undefined, "Aucune modification");
export type ChoicePatch = z.infer<typeof choicePatchSchema>;

const kindsSchema = z.array(kindSchema).max(6).refine((kinds) => new Set(kinds).size === kinds.length, "Catégorie en double");

export const choiceListBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  group: choiceGroupSchema.optional(),
  kinds: kindsSchema,
  multiple: z.boolean().default(false),
});
export type ChoiceListBody = z.infer<typeof choiceListBodySchema>;

export const choiceListPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    kinds: kindsSchema.optional(),
    multiple: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, "Aucune modification");
export type ChoiceListPatch = z.infer<typeof choiceListPatchSchema>;
