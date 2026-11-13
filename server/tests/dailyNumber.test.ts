import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { issueDailyNumber } from "../src/modules/orders/dailyNumber.js";
import { resetDb } from "./helpers.js";

beforeEach(resetDb);

const at = (algiers: string) => new Date(`${algiers}+01:00`);
const issue = (now: Date) => prisma.$transaction((tx) => issueDailyNumber(tx, now));

describe("issueDailyNumber", () => {
  it("numérote les commandes d'une même journée à la suite", async () => {
    expect((await issue(at("2026-11-13T10:00"))).dailyNumber).toBe(1);
    expect((await issue(at("2026-11-13T10:05"))).dailyNumber).toBe(2);
  });

  it("repart à 1 à minuit, heure d'Alger", async () => {
    await issue(at("2026-11-13T10:00"));
    const late = await issue(at("2026-11-13T23:59"));
    const next = await issue(at("2026-11-14T00:01"));
    expect(late.dailyNumber).toBe(2);
    expect(next.dailyNumber).toBe(1);
    expect(next.businessDate.toISOString().slice(0, 10)).toBe("2026-11-14");
  });

  it("ne donne jamais le même numéro à deux commandes simultanées", async () => {
    const numbers = await Promise.all(Array.from({ length: 8 }, () => issue(at("2026-11-13T12:00"))));
    expect(numbers.map((n) => n.dailyNumber).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
