import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { renameChoiceEverywhere } from "./choiceRename.js";
import { choiceGroupSchema } from "./choice.schema.js";
import type { ChoiceBody, ChoiceListBody, ChoiceListPatch, ChoicePatch } from "./choice.schema.js";

// Réponse rangée par liste : { storage: [{ id, label, hex }], color: […], … }
export async function listChoices() {
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
  return {
    ...grouped,
    values: grouped,
    lists: lists.map(({ id, name, group, kinds, multiple }) => ({ id, name, group, kinds, multiple })),
  };
}

// La palette publique : { "Orange": "#f47d3c", … }, pour les pastilles et les lueurs de la
// boutique. Une couleur sans teinte n'y est pas (le front l'écrit en toutes lettres).
export async function colorPalette() {
  const colors = await prisma.choice.findMany({
    where: { group: "color", hex: { not: null } },
    select: { label: true, hex: true },
  });
  return Object.fromEntries(colors.map((color) => [color.label, color.hex]));
}

export async function createChoice(body: ChoiceBody) {
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
  return prisma.choice.create({
    data: { group: body.group ?? null, listId: list.id, label: body.label, hex: body.hex ?? null },
  });
}

// Changer la teinte d'une couleur (pastilles et lueurs suivent) ou renommer une valeur
// (ses copies dans les produits suivent, voir choiceRename.ts).
export async function updateChoice(id: number, body: ChoicePatch) {
  const choice = await prisma.choice.findUnique({ where: { id } });
  if (!choice) {
    throw new AppError(404, "Valeur introuvable");
  }
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
  // Renommer : la valeur et toutes ses copies dans les produits, ensemble ou pas du tout.
  return prisma.$transaction(async (tx) => {
    if (body.label && body.label !== choice.label) {
      const list = choice.listId !== null ? await tx.choiceList.findUnique({ where: { id: choice.listId } }) : null;
      await renameChoiceEverywhere(tx, { group: choice.group, listName: list?.name ?? null }, choice.label, body.label);
    }
    return tx.choice.update({ where: { id: choice.id }, data: body });
  });
}

export async function deleteChoice(id: number) {
  await prisma.choice.delete({ where: { id } });
}

export async function createChoiceList(body: ChoiceListBody) {
  if (await prisma.choiceList.findUnique({ where: { name: body.name } })) {
    throw new AppError(409, "Une liste porte déjà cet intitulé");
  }
  if (body.group && (await prisma.choiceList.findUnique({ where: { group: body.group } }))) {
    throw new AppError(409, "Cette liste existe déjà");
  }
  return prisma.choiceList.create({ data: { ...body, group: body.group ?? null } });
}

export async function updateChoiceList(id: number, body: ChoiceListPatch) {
  const current = await prisma.choiceList.findUnique({ where: { id } });
  if (!current) {
    throw new AppError(404, "Liste introuvable");
  }
  if (body.name && body.name !== current.name && (await prisma.choiceList.findUnique({ where: { name: body.name } }))) {
    throw new AppError(409, "Une liste porte déjà cet intitulé");
  }

  return prisma.$transaction(async (tx) => {
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
}

export async function deleteChoiceList(id: number) {
  const list = await prisma.choiceList.findUnique({ where: { id } });
  if (!list) {
    throw new AppError(404, "Liste introuvable");
  }
  await prisma.$transaction(async (tx) => {
    await tx.choice.deleteMany({
      where: list.group ? { OR: [{ listId: list.id }, { group: list.group }] } : { listId: list.id },
    });
    await tx.choiceList.delete({ where: { id: list.id } });
  });
}
