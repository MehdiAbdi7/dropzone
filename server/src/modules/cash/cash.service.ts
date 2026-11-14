import { prisma, type Tx } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { algiersDate } from "../../utils/algiersTime.js";
import { cashSummary } from "./cashSummary.js";

const asDate = (day: string) => new Date(`${day}T00:00:00Z`);

// La journée de caisse d'aujourd'hui (heure d'Alger), avec ses mouvements et son résumé.
export async function getTodayCash(now: Date = new Date()) {
  const date = algiersDate(now);
  const [day, allMovements, reopenings] = await Promise.all([
    prisma.cashDay.findUnique({ where: { date: asDate(date) } }),
    prisma.moneyMovement.findMany({ where: { businessDate: asDate(date) }, orderBy: { createdAt: "asc" } }),
    prisma.cashReopening.findMany({ where: { businessDate: asDate(date) }, orderBy: { id: "asc" } }),
  ]);
  // La caisse, c'est le tiroir du magasin : l'argent d'une livraison (17/11, lot 4) n'y entre jamais.
  // Il est montré à part, pour que le vendeur sache qu'il est arrivé aujourd'hui.
  const movements = allMovements.filter((movement) => movement.orderType !== "delivery");
  const deliveriesCollected = allMovements
    .filter((movement) => movement.orderType === "delivery")
    .reduce((sum, movement) => sum + movement.amount, 0);
  return { date, day, summary: day ? cashSummary(day, movements) : null, movements, deliveriesCollected, reopenings };
}

// Rouvrir la caisse d'AUJOURD'HUI, fermée par erreur ou pour une vente tardive. L'argent déjà
// encaissé reste dans le jour (les dates restent vraies) ; seul le comptage est effacé, et la
// trace garde l'ancien. Conditionnelle comme la fermeture : seul celui qui fait passer la ligne
// de « fermée » à « ouverte » écrit la trace. Une caisse d'un jour passé ne se rouvre pas : une
// correction s'écrit le jour où elle est faite.
export async function reopenCashDay(userId: number, now: Date = new Date()) {
  const date = asDate(algiersDate(now));
  await prisma.$transaction(async (tx) => {
    // `FOR UPDATE` : la ligne est verrouillée avant d'être lue. Une fermeture ou une autre
    // réouverture simultanée attend la fin de cette transaction, donc le comptage qu'on trace
    // est bien celui qu'on efface (sinon la trace pourrait garder un ancien montant).
    const [day] = await tx.$queryRaw<{ counted_cash: number | null; closed_at: Date | null }[]>`
      SELECT counted_cash, closed_at FROM cash_days WHERE date = ${algiersDate(now)}::date FOR UPDATE`;
    if (!day) {
      throw new AppError(409, "Ouvrez la journée de caisse d'abord");
    }
    if (!day.closed_at) {
      throw new AppError(409, "La journée de caisse est déjà ouverte");
    }
    await tx.cashDay.update({ where: { date }, data: { countedCash: null, closedAt: null, closedById: null } });
    await tx.cashReopening.create({
      data: { businessDate: date, userId, previousCountedCash: day.counted_cash, previousClosedAt: day.closed_at },
    });
  });
  return getTodayCash(now);
}

export async function openCashDay(openingFloat: number, userId: number, now: Date = new Date()) {
  const date = asDate(algiersDate(now));
  // L'index unique sur la date refuse une deuxième ouverture, même simultanée.
  const existing = await prisma.cashDay.findUnique({ where: { date } });
  if (existing) {
    throw new AppError(409, "La journée de caisse est déjà ouverte");
  }
  try {
    await prisma.cashDay.create({ data: { date, openingFloat, openedById: userId } });
  } catch {
    throw new AppError(409, "La journée de caisse est déjà ouverte");
  }
  return getTodayCash(now);
}

export async function closeCashDay(countedCash: number, userId: number, now: Date = new Date()) {
  const date = asDate(algiersDate(now));
  // Conditionnelle : une caisse fermée ne se referme pas (le comptage ne change jamais après coup).
  const { count } = await prisma.cashDay.updateMany({
    where: { date, closedAt: null },
    data: { countedCash, closedAt: now, closedById: userId },
  });
  if (count !== 1) {
    const day = await prisma.cashDay.findUnique({ where: { date } });
    throw new AppError(409, day ? "La journée de caisse est déjà fermée" : "Ouvrez la journée de caisse d'abord");
  }
  return getTodayCash(now);
}

// Pour les ventes, retraits et échanges : la caisse du jour doit être ouverte et pas fermée.
// `FOR SHARE` : la ligne de la caisse est verrouillée en lecture jusqu'à la fin de la transaction.
// Une fermeture de caisse (un UPDATE de cette ligne) qui arrive entre ce contrôle et l'écriture de
// l'argent attend le commit : l'argent n'est jamais daté d'une caisse déjà fermée, dont le
// comptage et l'écart ne doivent plus bouger.
export async function requireOpenCashDay(tx: Tx, now: Date) {
  const [day] = await tx.$queryRaw<{ id: number; closed_at: Date | null }[]>`
    SELECT id, closed_at FROM cash_days WHERE date = ${algiersDate(now)}::date FOR SHARE`;
  if (!day) {
    throw new AppError(409, "Ouvrez la journée de caisse d'abord");
  }
  if (day.closed_at) {
    throw new AppError(409, "La journée de caisse est fermée : rouvrez-la dans Caisse, puis recommencez");
  }
  return day;
}
