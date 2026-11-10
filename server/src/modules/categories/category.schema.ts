import { z } from "zod";

const productKindSchema = z.enum(["phone", "tablet", "laptop", "watch", "accessory", "audiovisual"]);

export const categoryBodySchema = z.object({
  name: z.string().trim().min(2).max(60),
  kind: productKindSchema,
});

export type CategoryBody = z.infer<typeof categoryBodySchema>;

export const categoryPatchSchema = categoryBodySchema.partial();
export type CategoryPatch = z.infer<typeof categoryPatchSchema>;
