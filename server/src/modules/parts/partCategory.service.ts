import { prisma } from "../../config/db.js";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../utils/AppError.js";

// Les catégories de pièces (21/11) : Batterie, Afficheur… créées à la main. L'index unique `lower(btrim(name))` de la
// migration refuse deux catégories au même nom ; la clé étrangère des pièces (RESTRICT) refuse de supprimer une
// catégorie qui en contient encore.
const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

const duplicate = () => new AppError(409, "Une catégorie porte déjà ce nom");

const notEmpty = (count: number) =>
  new AppError(409, `Cette catégorie contient encore ${count} pièce${count > 1 ? "s" : ""} : vide-la d'abord (déplace ses pièces dans une autre catégorie).`);

async function nameConflict<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw duplicate();
    throw error;
  }
}

export async function listCategories() {
  const rows = await prisma.partCategory.findMany({ select: { id: true, name: true, _count: { select: { parts: true } } } });
  return rows
    .map((row) => ({ id: row.id, name: row.name, partsCount: row._count.parts }))
    .sort((a, b) => normalize(a.name).localeCompare(normalize(b.name)));
}

export async function createCategory(name: string) {
  const created = await nameConflict(() => prisma.partCategory.create({ data: { name }, select: { id: true, name: true } }));
  return { ...created, partsCount: 0 };
}

export async function renameCategory(id: number, name: string) {
  const exists = await prisma.partCategory.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new AppError(404, "Catégorie introuvable");
  const updated = await nameConflict(() =>
    prisma.partCategory.update({ where: { id }, data: { name }, select: { id: true, name: true, _count: { select: { parts: true } } } }),
  );
  return { id: updated.id, name: updated.name, partsCount: updated._count.parts };
}

export async function deleteCategory(id: number) {
  const found = await prisma.partCategory.findUnique({ where: { id }, select: { _count: { select: { parts: true } } } });
  if (!found) throw new AppError(404, "Catégorie introuvable");
  if (found._count.parts > 0) throw notEmpty(found._count.parts);
  try {
    await prisma.partCategory.delete({ where: { id } });
  } catch (error) {
    // Une pièce arrivée entre le comptage et la suppression : la clé étrangère l'a refusée.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") throw notEmpty(1);
    throw error;
  }
  return { ok: true as const };
}
