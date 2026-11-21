import { prisma } from "../../config/db.js";
import type { PaymentMethod, Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../utils/AppError.js";
import { algiersDate } from "../../utils/algiersTime.js";
import { normalizeText } from "../../utils/normalizeText.js";
import type { RepairInput, RepairListQuery, RepairPatch } from "./repair.schema.js";
import { nextStatuses, quoteTotal, repairAmount, type Status } from "./repairRules.js";
import { storageOf } from "./replacementRules.js";
import { afterQuoteChange, lockRepair } from "./repairStock.js";
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
  // Seulement pour savoir si le devis a été refusé : la liste n'a pas besoin de toutes les étapes.
  events: { where: { status: "to_return" }, select: { status: true } },
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
  replacementOrder: { select: { number: true } },
  // L'article d'origine : le dialogue du remplacement calcule la différence avant d'envoyer (le prix payé de l'article,
  // retiré pour le technicien avec `unitPrice`).
  originItem: { select: { unitPrice: true, productId: true, options: true } },
  returnedOn: true,
  paidAmount: true,
  partsCost: true,
  payMethod: true,
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
  events: { status: Status }[];
};

function toRow(repair: RowSource) {
  // Un devis refusé (même rendu ensuite) : aucune pièce n'a servi, le client ne doit que les frais de diagnostic
  // saisis à la main (la main-d'œuvre du devis refusé est remise à zéro au refus).
  const refused = repair.events.some((event) => event.status === "to_return");
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
    refused,
    total: refused ? (repair.laborPrice ?? 0) : quoteTotal(repair.laborPrice, repair.parts),
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
  replacementOrder: { number: number } | null;
  originItem: { unitPrice: number; productId: number | null; options: unknown } | null;
  returnedOn: Date | null;
  paidAmount: number | null;
  partsCost: number | null;
  payMethod: PaymentMethod | null;
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
    // Étape 6 : le numéro de la commande de remplacement (null : la fiche n'a pas été remplacée).
    replacementOrderNumber: repair.replacementOrder?.number ?? null,
    origin: repair.originItem ? { unitPrice: repair.originItem.unitPrice, productId: repair.originItem.productId, storage: storageOf(repair.originItem.options) } : null,
    // Ce que le client doit encore au Rendu (0 une fois rendu) ; après le Rendu, ce qu'il a payé, avec quel moyen,
    // le jour, et ce que les pièces ont coûté (admin seulement : `partsCost` est retiré pour les autres rôles).
    amountDue:
      repair.status === "returned" ? 0 : repairAmount({ underWarranty: repair.underWarranty, refused: toRow(repair).refused, laborPrice: repair.laborPrice, lines: repair.parts }),
    paidAmount: repair.paidAmount,
    payMethod: repair.payMethod,
    returnedOn: day(repair.returnedOn),
    partsCost: repair.partsCost,
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

// Les étapes qui regroupent plusieurs états ; toute autre étape est un état.
function stageWhere(stage: RepairListQuery["stage"]): Prisma.RepairWhereInput {
  if (stage === "open") return { status: { not: "returned" } };
  if (stage === "new") return { status: "received" };
  if (stage === "ongoing") return { status: { notIn: ["received", "returned"] } };
  return { status: stage };
}

export async function listRepairs(query: RepairListQuery) {
  const repairs = await prisma.repair.findMany({
    where: stageWhere(query.stage),
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
  const counts = { open: 0, new: 0, ongoing: 0, received: 0, quote: 0, in_repair: 0, ready: 0, to_return: 0, returned: 0 };
  for (const group of groups) {
    const count = group._count._all;
    counts[group.status] = count;
    if (group.status === "returned") continue;
    counts.open += count;
    if (group.status === "received") counts.new += count;
    else counts.ongoing += count;
  }
  return counts;
}

export async function updateRepair(id: number, input: RepairPatch, userId: number) {
  await prisma.$transaction(async (tx) => {
    const current = await lockRepair(tx, id);
    if (current.status === "returned") {
      throw new AppError(409, "Cette réparation est rendue : la fiche ne se modifie plus");
    }
    await tx.repair.update({ where: { id }, data: input });
    // Une autre main-d'œuvre change le prix : hors garantie, le client doit le valider de nouveau.
    if (input.laborPrice !== undefined && input.laborPrice !== current.laborPrice) {
      await afterQuoteChange(tx, current, userId);
    }
  });
  return getRepair(id);
}
