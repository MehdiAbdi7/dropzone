import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { resetDb } from "./helpers.js";

// Le lot 1 du back-office magasin (14/11) : types de commande, numéro du jour, caisse.
const BACKFILL = readFileSync(new URL("../src/scripts/lib/backfillDailyNumbers.sql", import.meta.url), "utf8");
const MIGRATION = readFileSync(
  new URL("../prisma/migrations/20261114090000_backoffice_lot1/migration.sql", import.meta.url),
  "utf8",
);

beforeEach(resetDb);

// Une commande d'avant le lot 1, insérée telle qu'elle existait (sans numéro du jour).
async function oldOrder(createdAtUtc: string) {
  await prisma.$executeRaw`
    INSERT INTO orders (full_name, phone, wilaya, commune, address, subtotal, shipping_fee, total, created_at,
                        daily_number, business_date)
    VALUES ('Client', '0555123456', '16 - Alger', 'Kouba', 'Rue 1', 1000, 0, 1000, ${new Date(createdAtUtc)}, 0, '2000-01-01')`;
}

describe("reprise des commandes existantes", () => {
  it("numérote chaque commande dans sa journée d'Alger, en livraison", async () => {
    await oldOrder("2026-11-12T09:00:00Z"); // 10h à Alger
    await oldOrder("2026-11-12T14:00:00Z"); // 15h à Alger
    await oldOrder("2026-11-12T23:30:00Z"); // 00h30 le 13/11 à Alger
    await prisma.$executeRawUnsafe(BACKFILL);
    const rows = await prisma.$queryRaw<{ type: string; daily_number: number; day: string }[]>`
      SELECT type::text, daily_number, to_char(business_date, 'YYYY-MM-DD') AS day FROM orders ORDER BY id`;
    expect(rows).toEqual([
      { type: "delivery", daily_number: 1, day: "2026-11-12" },
      { type: "delivery", daily_number: 2, day: "2026-11-12" },
      { type: "delivery", daily_number: 1, day: "2026-11-13" },
    ]);
  });

  it("la migration contient exactement cette reprise", () => {
    expect(MIGRATION).toContain(BACKFILL.trim());
  });
});

describe("réglages du magasin", () => {
  it("a une seule ligne, avec les horaires de départ", async () => {
    const settings = await prisma.storeSettings.findMany();
    expect(settings).toEqual([{ id: 1, openingTime: "09:00", closingTime: "20:00", closedDays: [] }]);
  });
});

describe("règles de la base", () => {
  it("refuse une livraison sans adresse", async () => {
    await expect(
      prisma.$executeRaw`
        INSERT INTO orders (type, full_name, phone, subtotal, shipping_fee, total, daily_number, business_date)
        VALUES ('delivery', 'Client', '0555123456', 1000, 0, 1000, 1, '2026-11-14')`,
    ).rejects.toThrow();
  });

  it("refuse un retrait sans jour, heure ni fin de réservation", async () => {
    await expect(
      prisma.$executeRaw`
        INSERT INTO orders (type, full_name, phone, subtotal, shipping_fee, total, daily_number, business_date)
        VALUES ('pickup', 'Client', '0555123456', 1000, 0, 1000, 1, '2026-11-14')`,
    ).rejects.toThrow();
  });
});
