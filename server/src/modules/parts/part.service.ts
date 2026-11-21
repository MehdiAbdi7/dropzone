import { prisma } from "../../config/db.js";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../utils/AppError.js";
import type { PartPatch } from "./part.schema.js";
import { weightedAveragePrice } from "./partMath.js";

// Les pièces de l'atelier (18/11, étape 1) : un stock avec son journal. Le stock ne change que par un
// arrivage ou une correction, chacun dans UNE transaction sur la ligne verrouillée : deux arrivages en même
// temps s'additionnent au lieu de s'écraser, et chaque mouvement garde le stock juste après lui.
const PART = { id: true, name: true, categoryId: true, purchasePrice: true, salePrice: true, stock: true, createdAt: true, updatedAt: true } as const;

// Sans accents ni majuscules : « écran » trouve « Écran iPhone 13 ». La liste est courte, le filtre se fait
// ici plutôt qu'en SQL.
const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

// L'index unique `lower(btrim(name))` de la migration refuse deux pièces au même nom, et la clé étrangère refuse une
// catégorie qui n'existe pas : les erreurs de la base deviennent un message qui dit quoi faire.
async function nameConflict<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") throw new AppError(409, "Une pièce porte déjà ce nom");
      if (error.code === "P2003") throw new AppError(400, "Cette catégorie n'existe pas");
    }
    throw error;
  }
}

export async function listParts(q: string) {
  const parts = await prisma.part.findMany({ select: PART });
  const needle = normalize(q.trim());
  return parts
    .filter((part) => normalize(part.name).includes(needle))
    .sort((a, b) => normalize(a.name).localeCompare(normalize(b.name)));
}

export async function createPart(input: { name: string; categoryId: number; purchasePrice: number; salePrice: number; stock?: number }, userId: number) {
  const { stock = 0, ...data } = input;
  return nameConflict(() =>
    prisma.$transaction(async (tx) => {
      const part = await tx.part.create({ data: { ...data, stock }, select: PART });
      if (stock > 0) {
        await tx.partMovement.create({
          data: { partId: part.id, kind: "arrival", delta: stock, unitCost: data.purchasePrice, stockAfter: stock, userId },
        });
      }
      return part;
    }),
  );
}

export async function updatePart(id: number, input: PartPatch) {
  const exists = await prisma.part.findUnique({ where: { id }, select: { id: true } });
  if (!exists) {
    throw new AppError(404, "Pièce introuvable");
  }
  return nameConflict(() => prisma.part.update({ where: { id }, data: input, select: PART }));
}

// Verrouille la ligne de la pièce jusqu'à la fin de la transaction et rend son état d'avant.
async function lockPart(tx: Prisma.TransactionClient, id: number) {
  const [row] = await tx.$queryRaw<{ stock: number; purchase_price: number }[]>`
    SELECT stock, purchase_price FROM parts WHERE id = ${id} FOR UPDATE`;
  if (!row) {
    throw new AppError(404, "Pièce introuvable");
  }
  return { stock: row.stock, purchasePrice: row.purchase_price };
}

export async function addArrival(id: number, input: { quantity: number; unitCost: number }, userId: number) {
  return prisma.$transaction(async (tx) => {
    const before = await lockPart(tx, id);
    const stock = before.stock + input.quantity;
    const part = await tx.part.update({
      where: { id },
      data: { stock, purchasePrice: weightedAveragePrice({ stock: before.stock, price: before.purchasePrice }, input) },
      select: PART,
    });
    await tx.partMovement.create({
      data: { partId: id, kind: "arrival", delta: input.quantity, unitCost: input.unitCost, stockAfter: stock, userId },
    });
    return part;
  });
}

export async function correctStock(id: number, input: { stock: number; note?: string }, userId: number) {
  return prisma.$transaction(async (tx) => {
    const before = await lockPart(tx, id);
    const delta = input.stock - before.stock;
    if (delta === 0) {
      throw new AppError(400, `Le stock est déjà de ${before.stock}`);
    }
    const part = await tx.part.update({ where: { id }, data: { stock: input.stock }, select: PART });
    await tx.partMovement.create({
      data: { partId: id, kind: "correction", delta, stockAfter: input.stock, userId, note: input.note || null },
    });
    return part;
  });
}

// Les 100 derniers mouvements, du plus récent au plus ancien.
export async function listMovements(id: number) {
  const exists = await prisma.part.findUnique({ where: { id }, select: { id: true } });
  if (!exists) {
    throw new AppError(404, "Pièce introuvable");
  }
  return prisma.partMovement.findMany({
    where: { partId: id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    select: { id: true, createdAt: true, kind: true, delta: true, unitCost: true, stockAfter: true, note: true, userId: true },
  });
}
