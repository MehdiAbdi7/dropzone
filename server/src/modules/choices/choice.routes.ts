import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { validate } from "../../middlewares/validate.js";

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
]);

const bodySchema = z.object({
  group: choiceGroupSchema,
  label: z.string().trim().min(1).max(80),
});
const idSchema = z.object({ id: z.coerce.number().int().positive() });

// Réponse rangée par liste : { storage: [{ id, label }], color: […], … }
async function getChoices(_req: Request, res: Response) {
  const choices = await prisma.choice.findMany({ orderBy: [{ group: "asc" }, { id: "asc" }] });
  const grouped: Record<string, { id: number; label: string }[]> = {};
  for (const group of choiceGroupSchema.options) {
    grouped[group] = [];
  }
  for (const choice of choices) {
    grouped[choice.group]?.push({ id: choice.id, label: choice.label });
  }
  res.json({ data: grouped });
}

async function postChoice(req: Request, res: Response) {
  const choice = await prisma.choice.create({ data: req.body as z.infer<typeof bodySchema> });
  res.status(201).json({ data: choice });
}

async function deleteChoice(req: Request, res: Response) {
  await prisma.choice.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
}

export const choiceAdminRouter = Router();
choiceAdminRouter.get("/choices", getChoices);
choiceAdminRouter.post("/choices", validate({ body: bodySchema }), postChoice);
choiceAdminRouter.delete("/choices/:id", validate({ params: idSchema }), deleteChoice);
