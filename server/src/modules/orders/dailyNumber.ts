import type { Prisma } from "../../generated/prisma/client.js";
import { algiersDate } from "../../utils/algiersTime.js";

// Le numéro du jour d'une commande (14/11) : il repart à 1 chaque jour à minuit, heure d'Alger.
// Le numéro unique (`number`, à partir de 1001) reste celui du suivi du client.
//
// Une seule requête, atomique : « crée la ligne du jour à 1, ou ajoute 1 si elle existe, et rends
// la valeur ». Deux commandes simultanées verrouillent la même ligne l'une après l'autre : elles
// ne reçoivent jamais le même numéro.
export async function issueDailyNumber(
  tx: Prisma.TransactionClient,
  now: Date,
): Promise<{ dailyNumber: number; businessDate: Date }> {
  const day = algiersDate(now);
  const [row] = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO daily_counters (date, value) VALUES (${day}::date, 1)
    ON CONFLICT (date) DO UPDATE SET value = daily_counters.value + 1
    RETURNING value`;
  return { dailyNumber: row.value, businessDate: new Date(`${day}T00:00:00Z`) };
}
