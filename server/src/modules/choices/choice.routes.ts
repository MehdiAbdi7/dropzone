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
const bodySchema = z
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
const patchSchema = z
  .object({ label: z.string().trim().min(1).max(80).optional(), hex: hexSchema.optional() })
  .refine((body) => body.label !== undefined || body.hex !== undefined, "Aucune modification");
const idSchema = z.object({ id: z.coerce.number().int().positive() });
const listBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  group: choiceGroupSchema.optional(),
  kinds: z.array(kindSchema).max(6).refine((kinds) => new Set(kinds).size === kinds.length, "Catégorie en double"),
  multiple: z.boolean().default(false),
});
const listPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    kinds: z.array(kindSchema).max(6).refine((kinds) => new Set(kinds).size === kinds.length, "Catégorie en double").optional(),
    multiple: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, "Aucune modification");

// Réponse rangée par liste : { storage: [{ id, label, hex }], color: […], … }
async function getChoices(_req: Request, res: Response) {
  const choices = await prisma.choice.findMany({ orderBy: [{ group: "asc" }, { id: "asc" }] });
  const lists = await prisma.choiceList.findMany({ orderBy: [{ id: "asc" }] });
  const grouped: Record<string, { id: number; label: string; hex: string | null }[]> = {};
  for (const group of choiceGroupSchema.options) {
    grouped[group] = [];
  }
  for (const list of lists) {
    grouped[list.group ?? `list:${list.id}`] = [];
  }
  for (const choice of choices) {
    grouped[choice.group ?? `list:${choice.listId}`]?.push({ id: choice.id, label: choice.label, hex: choice.hex });
  }
  res.json({
    data: {
      ...grouped,
      values: grouped,
      lists: lists.map(({ id, name, group, kinds, multiple }) => ({ id, name, group, kinds, multiple })),
    },
  });
}

async function postChoice(req: Request, res: Response) {
  const body = req.body as z.infer<typeof bodySchema>;
  const list = body.group
    ? await prisma.choiceList.findUnique({ where: { group: body.group }, select: { id: true } })
    : body.listId !== undefined
      ? await prisma.choiceList.findUnique({ where: { id: body.listId }, select: { id: true } })
      : null;
  if (!list) {
    throw new AppError(404, "Liste introuvable");
  }
  if (await prisma.choice.findFirst({ where: { listId: list.id, label: body.label }, select: { id: true } })) {
    throw new AppError(409, "Cette valeur existe déjà dans la liste");
  }
  const choice = await prisma.choice.create({
    data: { group: body.group ?? null, listId: list.id, label: body.label, hex: body.hex ?? null },
  });
  res.status(201).json({ data: choice });
}

// Changer la teinte d'une couleur : pastilles et lueurs suivent, aucun produit ne change.
async function patchChoice(req: Request, res: Response) {
  const choice = await prisma.choice.findUnique({ where: { id: Number(req.params.id) } });
  if (!choice) {
    throw new AppError(404, "Valeur introuvable");
  }
  const body = req.body as z.infer<typeof patchSchema>;
  if (body.hex !== undefined && choice.group !== "color") {
    throw new AppError(400, "Seule une couleur a une teinte");
  }
  if (
    body.label &&
    body.label !== choice.label &&
    (await prisma.choice.findFirst({
      where: {
        ...(choice.listId !== null ? { listId: choice.listId } : { group: choice.group }),
        label: body.label,
        id: { not: choice.id },
      },
      select: { id: true },
    }))
  ) {
    throw new AppError(409, "Cette valeur existe déjà dans la liste");
  }
  res.json({ data: await prisma.choice.update({ where: { id: choice.id }, data: body }) });
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

async function postChoiceList(req: Request, res: Response) {
  const body = req.body as z.infer<typeof listBodySchema>;
  if (await prisma.choiceList.findUnique({ where: { name: body.name } })) {
    throw new AppError(409, "Une liste porte déjà cet intitulé");
  }
  if (body.group && (await prisma.choiceList.findUnique({ where: { group: body.group } }))) {
    throw new AppError(409, "Cette liste existe déjà");
  }
  const list = await prisma.choiceList.create({ data: { ...body, group: body.group ?? null } });
  res.status(201).json({ data: list });
}

async function patchChoiceList(req: Request, res: Response) {
  const id = Number(req.params.id);
  const body = req.body as z.infer<typeof listPatchSchema>;
  const current = await prisma.choiceList.findUnique({ where: { id } });
  if (!current) {
    throw new AppError(404, "Liste introuvable");
  }
  if (body.name && body.name !== current.name && (await prisma.choiceList.findUnique({ where: { name: body.name } }))) {
    throw new AppError(409, "Une liste porte déjà cet intitulé");
  }

  const saved = await prisma.$transaction(async (tx) => {
    const renamingCustomList = body.name !== undefined && body.name !== current.name && current.group === null;
    const variants = renamingCustomList ? await tx.productVariant.findMany({ select: { id: true, options: true } }) : [];
    if (renamingCustomList) {
      const colliding = variants.some((variant) => {
        const options = variant.options;
        return (
          typeof options === "object" &&
          options !== null &&
          !Array.isArray(options) &&
          current.name in options &&
          body.name! in options
        );
      });
      if (colliding) {
        throw new AppError(409, "Un produit utilise déjà ce nom de caractéristique");
      }
    }

    const list = await tx.choiceList.update({ where: { id }, data: body });
    if (renamingCustomList && body.name) {
      for (const variant of variants) {
        const options = variant.options;
        if (typeof options === "object" && options !== null && !Array.isArray(options) && current.name in options) {
          const updated = { ...options, [body.name]: options[current.name] };
          delete updated[current.name];
          await tx.productVariant.update({ where: { id: variant.id }, data: { options: updated } });
        }
      }
    }
    return list;
  });
  res.json({ data: saved });
}

async function deleteChoiceList(req: Request, res: Response) {
  const list = await prisma.choiceList.findUnique({ where: { id: Number(req.params.id) } });
  if (!list) {
    throw new AppError(404, "Liste introuvable");
  }
  await prisma.$transaction(async (tx) => {
    await tx.choice.deleteMany({
      where: list.group ? { OR: [{ listId: list.id }, { group: list.group }] } : { listId: list.id },
    });
    await tx.choiceList.delete({ where: { id: list.id } });
  });
  res.status(204).end();
}

export const choiceAdminRouter = Router();
choiceAdminRouter.get("/choices", getChoices);
choiceAdminRouter.post("/choices", validate({ body: bodySchema }), postChoice);
choiceAdminRouter.patch("/choices/:id", validate({ params: idSchema, body: patchSchema }), patchChoice);
choiceAdminRouter.delete("/choices/:id", validate({ params: idSchema }), deleteChoice);
choiceAdminRouter.post("/choice-lists", validate({ body: listBodySchema }), postChoiceList);
choiceAdminRouter.patch("/choice-lists/:id", validate({ params: idSchema, body: listPatchSchema }), patchChoiceList);
choiceAdminRouter.delete("/choice-lists/:id", validate({ params: idSchema }), deleteChoiceList);
