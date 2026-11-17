import { prisma, type Tx } from "../../config/db.js";
import type { StoreHours } from "../../utils/algiersTime.js";

// Les réglages du magasin : une seule ligne (id = 1), créée par la migration.
export async function getStoreHours(db: Tx = prisma): Promise<StoreHours> {
  const settings = await db.storeSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: { openingTime: true, closingTime: true, closedDays: true },
  });
  return settings;
}

export async function setStoreHours(hours: StoreHours): Promise<StoreHours> {
  return prisma.storeSettings.update({
    where: { id: 1 },
    data: { ...hours, closedDays: [...hours.closedDays].sort((a, b) => a - b) },
    select: { openingTime: true, closingTime: true, closedDays: true },
  });
}

// La réservation illimitée (18/11). Côté admin : l'avance et le numéro. Côté public : seulement le montant de
// l'avance, et seulement si l'offre est complète (avance > 0 et numéro renseigné) ; le numéro ne sort jamais ici.
export async function getReservationSettings(db: Tx = prisma): Promise<{ advance: number; baridiNumber: string }> {
  const settings = await db.storeSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: { reservationAdvance: true, baridiNumber: true },
  });
  return { advance: settings.reservationAdvance, baridiNumber: settings.baridiNumber };
}

export async function setReservationSettings(input: { advance: number; baridiNumber: string }) {
  await prisma.storeSettings.update({
    where: { id: 1 },
    data: { reservationAdvance: input.advance, baridiNumber: input.baridiNumber },
  });
  return getReservationSettings();
}

// L'avance proposée aux clients, ou null quand l'offre est coupée ou incomplète.
export async function getUnlimitedAdvance(db: Tx = prisma): Promise<number | null> {
  const { advance, baridiNumber } = await getReservationSettings(db);
  return advance > 0 && baridiNumber.trim() !== "" ? advance : null;
}
