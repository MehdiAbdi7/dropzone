import { prisma, type Tx } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { algiersDate } from "../../utils/algiersTime.js";
import { cashSummary } from "./cashSummary.js";

const asDate = (day: string) => new Date(`${day}T00:00:00Z`);

// La journée de caisse d'aujourd'hui (heure d'Alger), avec ses mouvements et son résumé.
export async function getTodayCash(now: Date = new Date()) {
  const date = algiersDate(now);
  const [day, movements] = await Promise.all([
    prisma.cashDay.findUnique({ where: { date: asDate(date) } }),
    prisma.moneyMovement.findMany({ where: { businessDate: asDate(date) }, orderBy: { createdAt: "asc" } }),
  ]);
  return { date, day, summary: day ? cashSummary(day, movements) : null, movements };
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
export async function requireOpenCashDay(tx: Tx, now: Date) {
  const day = await tx.cashDay.findUnique({ where: { date: asDate(algiersDate(now)) } });
  if (!day) {
    throw new AppError(409, "Ouvrez la journée de caisse d'abord");
  }
  if (day.closedAt) {
    throw new AppError(409, "La journée de caisse est fermée");
  }
  return day;
}
