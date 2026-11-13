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
