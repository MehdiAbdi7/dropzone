import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { validate } from "../../middlewares/validate.js";
import { AppError } from "../../utils/AppError.js";

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

// La teinte d'une couleur, rangée en minuscules (« #F47D3C » devient « #f47d3c ») :
// la même règle que le CHECK de la base.
const hexSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-f]{6}$/i, { error: "Une teinte s'écrit comme #f47d3c" })
  .transform((hex) => hex.toLowerCase());

// Une nouvelle couleur arrive avec sa teinte (sinon pas de pastille, et une lueur violette
// sur l'affiche) ; les autres listes n'en ont pas.
const bodySchema = z
  .object({
    group: choiceGroupSchema,
    label: z.string().trim().min(1).max(80),
    hex: hexSchema.optional(),
  })
  .superRefine((body, ctx) => {
    if (body.group === "color" && !body.hex) {
      ctx.addIssue({ code: "custom", path: ["hex"], message: "Choisissez la teinte de la couleur" });
    }
    if (body.group !== "color" && body.hex) {
      ctx.addIssue({ code: "custom", path: ["hex"], message: "Seule une couleur a une teinte" });
    }
  });
const patchSchema = z.object({ hex: hexSchema });
const idSchema = z.object({ id: z.coerce.number().int().positive() });

// Réponse rangée par liste : { storage: [{ id, label, hex }], color: […], … }
async function getChoices(_req: Request, res: Response) {
  const choices = await prisma.choice.findMany({ orderBy: [{ group: "asc" }, { id: "asc" }] });
  const grouped: Record<string, { id: number; label: string; hex: string | null }[]> = {};
  for (const group of choiceGroupSchema.options) {
    grouped[group] = [];
  }
  for (const choice of choices) {
    grouped[choice.group]?.push({ id: choice.id, label: choice.label, hex: choice.hex });
  }
  res.json({ data: grouped });
}

async function postChoice(req: Request, res: Response) {
  const choice = await prisma.choice.create({ data: req.body as z.infer<typeof bodySchema> });
  res.status(201).json({ data: choice });
}

// Changer la teinte d'une couleur : pastilles et lueurs suivent, aucun produit ne change.
async function patchChoice(req: Request, res: Response) {
  const choice = await prisma.choice.findUnique({ where: { id: Number(req.params.id) } });
  if (!choice) {
    throw new AppError(404, "Valeur introuvable");
  }
  if (choice.group !== "color") {
    throw new AppError(400, "Seule une couleur a une teinte");
  }
  const { hex } = req.body as z.infer<typeof patchSchema>;
  res.json({ data: await prisma.choice.update({ where: { id: choice.id }, data: { hex } }) });
}

// La palette publique : { "Orange": "#f47d3c", … }, pour les pastilles et les lueurs de la
// boutique. Une couleur sans teinte n'y est pas (le front l'écrit en toutes lettres).
async function getColors(_req: Request, res: Response) {
  const colors = await prisma.choice.findMany({
    where: { group: "color", hex: { not: null } },
    select: { label: true, hex: true },
  });
  res.json({ data: Object.fromEntries(colors.map((color) => [color.label, color.hex])) });
}

export const colorRouter = Router();
colorRouter.get("/", getColors);

async function deleteChoice(req: Request, res: Response) {
  await prisma.choice.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
}

export const choiceAdminRouter = Router();
choiceAdminRouter.get("/choices", getChoices);
choiceAdminRouter.post("/choices", validate({ body: bodySchema }), postChoice);
choiceAdminRouter.patch("/choices/:id", validate({ params: idSchema, body: patchSchema }), patchChoice);
choiceAdminRouter.delete("/choices/:id", validate({ params: idSchema }), deleteChoice);
