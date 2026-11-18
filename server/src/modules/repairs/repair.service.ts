import { prisma } from "../../config/db.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../utils/AppError.js";
import { algiersDate } from "../../utils/algiersTime.js";
import { normalizeText } from "../../utils/normalizeText.js";
import type { RepairInput, RepairListQuery, RepairPatch } from "./repair.schema.js";
import { nextStatuses, quoteTotal, type Status } from "./repairRules.js";
import { findWarrantyItem, warrantyOf } from "./warranty.service.js";

// Les fiches de réparation (18/11, étape 2) : création, liste, détail, modification. Les pièces, les étapes et la
// suppression sont dans repairParts.service.ts et repairStatus.service.ts.
const LIST_LIMIT = 200;

const ROW_SELECT = {
  id: true,
  number: true,
  status: true,
  fullName: true,
  phone: true,
  deviceName: true,
  underWarranty: true,
  laborPrice: true,
  createdAt: true,
  parts: { select: { quantity: true, unitPrice: true } },
} satisfies Prisma.RepairSelect;

export const DETAIL_SELECT = {
  ...ROW_SELECT,
  deviceColor: true,
  deviceState: true,
  issue: true,
  accessories: true,
  note: true,
  warrantyEndsAt: true,
  warrantyForcedOff: true,
  originOrderNumber: true,
  parts: { orderBy: { id: "asc" }, select: { id: true, partId: true, name: true, quantity: true, unitCost: true, unitPrice: true, consumed: true } },
  events: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { status: true, createdAt: true, userId: true } },
} satisfies Prisma.RepairSelect;

const day = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

type RowSource = {
  id: number;
  number: number;
  status: Status;
  fullName: string;
  phone: string;
  deviceName: string;
  underWarranty: boolean;
  laborPrice: number | null;
  createdAt: Date;
  parts: { quantity: number; unitPrice: number }[];
};

function toRow(repair: RowSource) {
  return {
    id: repair.id,
    number: repair.number,
    status: repair.status,
    fullName: repair.fullName,
    phone: repair.phone,
    deviceName: repair.deviceName,
    underWarranty: repair.underWarranty,
    createdAt: repair.createdAt,
    partsCount: repair.parts.length,
    total: quoteTotal(repair.laborPrice, repair.parts),
  };
}

type DetailSource = RowSource & {
  deviceColor: string | null;
  deviceState: string | null;
  issue: string;
  accessories: string | null;
  note: string | null;
  warrantyEndsAt: Date | null;
  warrantyForcedOff: boolean;
  originOrderNumber: number | null;
  parts: { id: number; partId: number; name: string; quantity: number; unitCost: number; unitPrice: number; consumed: boolean }[];
  events: { status: Status; createdAt: Date; userId: number | null }[];
};

function toDetail(repair: DetailSource) {
  return {
    ...toRow(repair),
    deviceColor: repair.deviceColor,
    deviceState: repair.deviceState,
    issue: repair.issue,
    accessories: repair.accessories,
    laborPrice: repair.laborPrice,
    note: repair.note,
    warrantyEndsAt: day(repair.warrantyEndsAt),
    warrantyForcedOff: repair.warrantyForcedOff,
    originOrderNumber: repair.originOrderNumber,
    parts: repair.parts,
    events: repair.events,
    nextStatuses: nextStatuses(repair.status, repair.underWarranty),
  };
}

export async function getRepair(id: number) {
  const repair = await prisma.repair.findUnique({ where: { id }, select: DETAIL_SELECT });
  if (!repair) {
    throw new AppError(404, "Fiche de réparation introuvable");
  }
  return toDetail(repair);
}

export async function createRepair(input: RepairInput, userId: number, now: Date = new Date()) {
  const { originItemId, forceOutOfWarranty = false, ...device } = input;

  // La garantie est un calcul du serveur : le client dit seulement quel article, et s'il faut l'ignorer.
  let origin: { orderNumber: number; endsAt: string; underWarranty: boolean; itemId: number } | null = null;
  if (originItemId !== undefined) {
    const item = await findWarrantyItem(originItemId);
    if (!item) {
      throw new AppError(400, "Cet article n'ouvre pas de garantie");
    }
    const hit = warrantyOf(item, algiersDate(now));
    origin = { orderNumber: hit.orderNumber, endsAt: hit.warrantyEndsAt, underWarranty: hit.underWarranty, itemId: hit.itemId };
  }

  const repair = await prisma.$transaction(async (tx) => {
    const created = await tx.repair.create({
      data: {
        ...device,
        underWarranty: origin !== null && origin.underWarranty && !forceOutOfWarranty,
        warrantyForcedOff: origin !== null && forceOutOfWarranty,
        warrantyEndsAt: origin ? new Date(`${origin.endsAt}T00:00:00Z`) : null,
        originItemId: origin?.itemId ?? null,
        originOrderNumber: origin?.orderNumber ?? null,
        createdById: userId,
      },
      select: { id: true },
    });
    await tx.repairEvent.create({ data: { repairId: created.id, status: "received", userId } });
    return created;
  });
  return getRepair(repair.id);
}

// « R-1001 », « r 1001 » ou « 1001 » : le numéro d'une fiche.
const asNumber = (text: string) => /^(?:r[-\s]?)?(\d+)$/i.exec(text.trim())?.[1];

export async function listRepairs(query: RepairListQuery) {
  const repairs = await prisma.repair.findMany({
    where: query.stage === "open" ? { status: { not: "returned" } } : { status: query.stage },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: ROW_SELECT,
  });
  const needle = normalizeText(query.q.trim());
  const number = asNumber(query.q);
  const found = needle
    ? repairs.filter(
        (repair) =>
          (number !== undefined && repair.number === Number(number)) ||
          repair.phone.includes(needle) ||
          normalizeText(repair.fullName).includes(needle),
      )
    : repairs;
  return found.slice(0, LIST_LIMIT).map(toRow);
}

export async function countRepairs() {
  const groups = await prisma.repair.groupBy({ by: ["status"], _count: { _all: true } });
  const counts = { open: 0, received: 0, quote: 0, in_repair: 0, ready: 0, to_return: 0, returned: 0 };
  for (const group of groups) {
    counts[group.status] = group._count._all;
    if (group.status !== "returned") counts.open += group._count._all;
  }
  return counts;
}

export async function updateRepair(id: number, input: RepairPatch) {
  const current = await prisma.repair.findUnique({ where: { id }, select: { status: true } });
  if (!current) {
    throw new AppError(404, "Fiche de réparation introuvable");
  }
  if (current.status === "returned") {
    throw new AppError(409, "Cette réparation est rendue : la fiche ne se modifie plus");
  }
  await prisma.repair.update({ where: { id }, data: input });
  return getRepair(id);
}
