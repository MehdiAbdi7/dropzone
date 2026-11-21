import { expect } from "vitest";
import { prisma } from "../src/config/db.js";
import { loginAs, partCategoryId } from "./helpers.js";

// Les gestes communs des tests de l'atelier : un admin connecté, une pièce en stock, une fiche, une ligne, une étape.
export const adminAgent = async () => (await loginAs("admin", `admin${Math.random()}@test.dz`)).agent;
export type Agent = Awaited<ReturnType<typeof adminAgent>>;

export const device = {
  fullName: "Karim Benali",
  phone: "0550123456",
  deviceName: "iPhone 13",
  issue: "L'écran ne s'allume plus",
};

export type RepairBody = {
  id: number;
  number: number;
  status: string;
  underWarranty: boolean;
  laborPrice: number | null;
  parts: { id: number; partId: number; quantity: number; unitCost: number; unitPrice: number; consumed: boolean; name: string }[];
  events: { status: string; userId: number | null }[];
  nextStatuses: string[];
};

// Une pièce en stock directement en base (l'API des pièces est testée à part).
export const makePart = async (name = "Batterie iPhone 13", stock = 5, purchasePrice = 3_500, salePrice = 6_000) =>
  prisma.part.create({ data: { name, categoryId: await partCategoryId(), purchasePrice, salePrice, stock }, select: { id: true, name: true, categoryId: true } });

export const stockOf = async (partId: number) => (await prisma.part.findUniqueOrThrow({ where: { id: partId }, select: { stock: true } })).stock;

// Une fiche créée par l'API. Par défaut hors garantie avec une main-d'œuvre fixée (donc un devis).
export async function makeRepair(agent: Agent, over: Record<string, unknown> = {}): Promise<RepairBody> {
  const response = await agent.post("/admin/repairs").send({ ...device, laborPrice: 1_000, ...over });
  expect(response.status, JSON.stringify(response.body)).toBe(201);
  return response.body.data;
}

// Une fiche sous garantie : on l'écrit directement (le calcul de la garantie est testé avec la création).
export async function makeWarrantyRepair(agent: Agent): Promise<RepairBody> {
  const repair = await makeRepair(agent);
  await prisma.repair.update({ where: { id: repair.id }, data: { underWarranty: true, warrantyEndsAt: new Date("2030-01-01T00:00:00Z") } });
  return (await agent.get(`/admin/repairs/${repair.id}`).expect(200)).body.data;
}

export async function addLine(agent: Agent, repairId: number, partId: number, quantity = 1) {
  return agent.post(`/admin/repairs/${repairId}/parts`).send({ partId, quantity });
}

export async function addLineOk(agent: Agent, repairId: number, partId: number, quantity = 1): Promise<RepairBody> {
  const response = await addLine(agent, repairId, partId, quantity);
  expect(response.status, JSON.stringify(response.body)).toBe(200);
  return response.body.data;
}

export const setStatus = (agent: Agent, repairId: number, status: string, method?: string) =>
  agent.post(`/admin/repairs/${repairId}/status`).send({ status, ...(method ? { method } : {}) });

export async function setStatusOk(agent: Agent, repairId: number, status: string, method?: string): Promise<RepairBody> {
  const response = await setStatus(agent, repairId, status, method);
  expect(response.status, JSON.stringify(response.body)).toBe(200);
  return response.body.data;
}

export const movementsOf = (partId: number) => prisma.partMovement.findMany({ where: { partId }, orderBy: { id: "asc" } });

// Ouvre la caisse du jour (le Rendu avec de l'argent l'exige).
export const openCash = (agent: Agent, openingFloat = 10_000) => agent.post("/admin/cash/open").send({ openingFloat }).expect(201);

// Une fiche prête à être rendue : une pièce vendue 6 000 (achetée 3 500), main-d'œuvre 2 000, donc 8 000 DA à payer.
export async function readyRepair(agent: Agent, over: Record<string, unknown> = {}) {
  const part = await makePart("Batterie iPhone 13", 5, 3_500, 6_000);
  const repair = await makeRepair(agent, { laborPrice: 2_000, ...over });
  await addLineOk(agent, repair.id, part.id, 1);
  await setStatusOk(agent, repair.id, "in_repair");
  await setStatusOk(agent, repair.id, "ready");
  return { repair, part };
}
