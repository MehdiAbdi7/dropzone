import { z } from "zod";

const productKindSchema = z.enum(["phone", "tablet", "laptop", "watch", "accessory", "audiovisual"]);

export const categoryBodySchema = z.object({
  name: z.string().trim().min(2).max(60),
  kind: productKindSchema,
});

export type CategoryBody = z.infer<typeof categoryBodySchema>;

// `featured` : la catégorie mise en avant sur l'accueil (une seule à la fois, 11/11).
export const categoryPatchSchema = categoryBodySchema.partial().extend({ featured: z.boolean().optional() });
export type CategoryPatch = z.infer<typeof categoryPatchSchema>;
