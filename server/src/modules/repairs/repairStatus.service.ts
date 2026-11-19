import { prisma } from "../../config/db.js";
import type { PaymentMethod } from "../../generated/prisma/client.js";
import { AppError } from "../../utils/AppError.js";
import { algiersDate } from "../../utils/algiersTime.js";
import { requireOpenCashDay } from "../cash/cash.service.js";
import { getRepair } from "./repair.service.js";
import { hasQuote, nextStatuses, repairAmount, STATUS_LABELS, type Status } from "./repairRules.js";
import { lockRepair, moveStock, setStatus } from "./repairStock.js";

// Les étapes d'une fiche et sa suppression (18/11, étape 2). Chaque geste verrouille la fiche : un second envoi du
// même passage attend le premier, puis voit une étape qui ne le permet plus et se fait refuser.

export async function changeStatus(repairId: number, target: Status, userId: number, method?: PaymentMethod, now: Date = new Date()) {
  await prisma.$transaction(async (tx) => {
    const repair = await lockRepair(tx, repairId);

    if (target === "quote" && repair.underWarranty && repair.status === "received") {
      throw new AppError(400, "Sous garantie : pas de devis");
    }
    if (!nextStatuses(repair.status, repair.underWarranty).includes(target)) {
      throw new AppError(409, `Passage impossible de « ${STATUS_LABELS[repair.status]} » à « ${STATUS_LABELS[target]} »`);
    }

    const lines = await tx.repairPart.findMany({ where: { repairId }, orderBy: { partId: "asc" } });
    // Hors garantie, le client ne peut ni valider ni accepter un prix qui n'existe pas encore.
    if ((target === "quote" || target === "in_repair") && !repair.underWarranty && !hasQuote(repair.laborPrice, lines.length)) {
      throw new AppError(400, "Fixez le devis avant de le proposer au client");
    }

    // Les pièces sortent du stock à « En réparation » : toutes, ou aucune (la transaction s'annule au premier manque).
    if (target === "in_repair") {
      for (const line of lines.filter((candidate) => !candidate.consumed)) {
        await moveStock(tx, { partId: line.partId, delta: -line.quantity, repair, userId });
        await tx.repairPart.update({ where: { id: line.id }, data: { consumed: true } });
      }
    }
    // Un devis refusé ne garde aucune pièce sortie : celles déjà sorties reviennent au stock.
    if (target === "to_return") {
      await returnConsumedLines(tx, repair, lines, userId);
      // La main-d'œuvre du devis refusé ne sera pas due : des frais de diagnostic seront une saisie voulue.
      await tx.repair.update({ where: { id: repairId }, data: { laborPrice: null } });
    }
    // Le Rendu (étape 3) : l'argent entre dans le journal et la caisse du jour, UNE fois (le verrou de la fiche et
    // l'étape « Prêt » ou « À rendre » l'exigent), et le bénéfice est figé sur la fiche.
    if (target === "returned") {
      await collect(tx, repair, lines, method, userId, now);
    }
    await setStatus(tx, repairId, target, userId);
  });
  return getRepair(repairId);
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// Ce que le client paie au Rendu, écrit dans le journal (un seul mouvement, ou aucun à 0 DA), et ce que la fiche
// garde : le jour, le montant, le moyen et le coût des pièces sorties. La caisse du jour doit être ouverte dès qu'il
// y a de l'argent : une journée fermée n'est jamais réécrite.
async function collect(
  tx: Tx,
  repair: { id: number; number: number; underWarranty: boolean; laborPrice: number | null },
  lines: { quantity: number; unitPrice: number; unitCost: number; consumed: boolean }[],
  method: PaymentMethod | undefined,
  userId: number,
  now: Date,
) {
  const refused = (await tx.repairEvent.count({ where: { repairId: repair.id, status: "to_return" } })) > 0;
  const amount = repairAmount({ underWarranty: repair.underWarranty, refused, laborPrice: repair.laborPrice, lines });
  const partsCost = lines.filter((line) => line.consumed).reduce((sum, line) => sum + line.unitCost * line.quantity, 0);
  const day = new Date(`${algiersDate(now)}T00:00:00Z`);

  if (amount > 0) {
    if (!method) {
      throw new AppError(400, "Choisissez le moyen de paiement");
    }
    await requireOpenCashDay(tx, now);
    await tx.moneyMovement.create({
      data: { businessDate: day, amount, method, kind: "repair", repairId: repair.id, userId, note: `Réparation R-${repair.number}` },
    });
  }
  await tx.repair.update({
    where: { id: repair.id },
    data: { returnedOn: day, paidAmount: amount, partsCost, payMethod: amount > 0 ? method : null },
  });
}

export async function returnConsumedLines(
  tx: Tx,
  repair: { id: number; number: number },
  lines: { id: number; partId: number; quantity: number; consumed: boolean }[],
  userId: number,
) {
  for (const line of lines.filter((candidate) => candidate.consumed)) {
    await moveStock(tx, { partId: line.partId, delta: line.quantity, repair, userId });
    await tx.repairPart.update({ where: { id: line.id }, data: { consumed: false } });
  }
}

// Supprimer une fiche (admin). Les pièces sorties reviennent au stock, le journal des pièces garde le mouvement
// (avec le numéro de la fiche). Une fiche RENDUE (étape 3) a aussi de l'argent : il est rendu par un mouvement
// `correction` négatif écrit AUJOURD'HUI (une caisse fermée n'est jamais réécrite, donc la caisse du jour doit être
// ouverte), pour exactement ce que le journal a reçu pour CETTE fiche (`repair_id`). Une trace garde de quoi la
// retrouver puisque la fiche disparaît.
export async function deleteRepair(repairId: number, userId: number, now: Date = new Date()) {
  return prisma.$transaction(async (tx) => {
    const repair = await lockRepair(tx, repairId);
    const lines = await tx.repairPart.findMany({ where: { repairId }, orderBy: { partId: "asc" } });

    let refunded = 0;
    if (repair.status === "returned") {
      const own = await tx.moneyMovement.findMany({ where: { repairId }, select: { method: true, amount: true } });
      const net = new Map<PaymentMethod, number>();
      for (const movement of own) {
        net.set(movement.method, (net.get(movement.method) ?? 0) + movement.amount);
      }
      const refunds = [...net.entries()].filter(([, amount]) => amount !== 0);
      if (refunds.length > 0) {
        await requireOpenCashDay(tx, now);
      }
      for (const [method, amount] of refunds) {
        await tx.moneyMovement.create({
          data: {
            businessDate: new Date(`${algiersDate(now)}T00:00:00Z`),
            amount: -amount,
            method,
            kind: "correction",
            repairId,
            userId,
            note: `Suppression de la réparation R-${repair.number}`,
          },
        });
      }
      refunded = refunds.reduce((sum, [, amount]) => sum + amount, 0);
      const fiche = await tx.repair.findUniqueOrThrow({ where: { id: repairId }, select: { fullName: true, deviceName: true } });
      await tx.orderEvent.create({
        data: {
          kind: "deleted",
          orderId: null,
          orderType: null,
          orderNumber: repair.number,
          repairNumber: repair.number,
          userId,
          summary: `Réparation supprimée : ${fiche.fullName}, ${fiche.deviceName}, ${refunded} DA rendus`,
          amountDelta: -refunded,
        },
      });
    }

    await returnConsumedLines(tx, repair, lines, userId);
    await tx.repair.delete({ where: { id: repairId } });
    return { ok: true, refunded };
  });
}
