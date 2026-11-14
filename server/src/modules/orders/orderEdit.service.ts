import { prisma, type Tx } from "../../config/db.js";
import type { PaymentMethod } from "../../generated/prisma/client.js";
import { AppError } from "../../utils/AppError.js";
import { algiersDate } from "../../utils/algiersTime.js";
import { requireOpenCashDay } from "../cash/cash.service.js";
import { buildConditionReport, refreshMinPrice } from "../products/product.service.js";
import type { EditOrderInput } from "./order.schema.js";
import { lockOrder } from "./orderLock.js";
import { correctionMovements, describeEdit, groupThousands, stockDeltas } from "./orderMath.js";
import { restockItems } from "./reservations.js";

// Modifier et supprimer une commande après coup (15/11, lot 2). Deux règles tiennent tout :
//  - le stock et l'argent suivent : la différence de stock est appliquée, et l'argent déjà
//    encaissé est corrigé par des mouvements `correction` écrits à la date d'AUJOURD'HUI. Une
//    caisse fermée n'est jamais réécrite : c'est pourquoi toute correction d'argent exige la
//    journée de caisse d'aujourd'hui ouverte ;
//  - une trace reste dans `order_events` (qui, quoi, de combien), même après une suppression.

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Espèces",
  baridimob: "BaridiMob",
  ccp: "CCP",
  card: "Carte",
  transfer: "Virement",
};

// Sous la limite d'un entier de 32 bits (2 147 483 647), avec de la marge pour les sommes.
const MAX_TOTAL = 2_000_000_000;

const asDay = (now: Date) => new Date(`${algiersDate(now)}T00:00:00Z`);

// Ce que le journal a déjà reçu pour la commande, par moyen de paiement (corrections comprises).
// `hasPayment` : la commande a été payée un jour (un mouvement qui n'est pas une correction),
// même si une correction a ramené son net à 0 DA. C'est lui qui dit « payée », pas le net : sinon
// une commande ramenée à 0 puis remise à son prix passerait pour « pas encore payée » et son
// argent ne serait jamais réécrit.
async function paidByMethod(tx: Tx, orderId: number) {
  const movements = await tx.moneyMovement.findMany({ where: { orderId }, select: { method: true, amount: true, kind: true } });
  const paid: Partial<Record<PaymentMethod, number>> = {};
  for (const movement of movements) {
    paid[movement.method] = (paid[movement.method] ?? 0) + movement.amount;
  }
  return {
    paid,
    total: movements.reduce((sum, movement) => sum + movement.amount, 0),
    hasPayment: movements.some((movement) => movement.kind !== "correction"),
  };
}

// Le moyen qui porte le plus d'argent : celui qu'on garde si l'admin n'en choisit pas un autre.
function mainMethod(paid: Partial<Record<PaymentMethod, number>>): PaymentMethod {
  const entries = Object.entries(paid) as [PaymentMethod, number][];
  return entries.reduce((best, entry) => (entry[1] > best[1] ? entry : best), entries[0])[0];
}

export async function editOrder(id: number, input: EditOrderInput, userId: number, now: Date = new Date()) {
  return prisma.$transaction(async (tx) => {
    await lockOrder(tx, id);
    const order = await tx.order.findUniqueOrThrow({ where: { id }, include: { items: { orderBy: { id: "asc" } } } });
    if (order.status === "cancelled" || order.status === "expired") {
      throw new AppError(409, "Une commande annulée ou expirée ne peut plus être modifiée");
    }

    const gifts = order.items.filter((item) => item.isGift);
    const paying = order.items.filter((item) => !item.isGift);

    // 1. Les lignes demandées : une existante (id) ou un nouvel article (sku).
    const keptIds = new Set<number>();
    const newLines: { sku: string; quantity: number; unitPrice: number }[] = [];
    for (const line of input.lines) {
      if ("id" in line) {
        if (!paying.some((item) => item.id === line.id) || keptIds.has(line.id)) {
          throw new AppError(400, "Une ligne de la commande est inconnue ou en double");
        }
        keptIds.add(line.id);
      } else {
        newLines.push(line);
      }
    }
    const skus = [...paying.filter((item) => keptIds.has(item.id)).map((item) => item.sku), ...newLines.map((line) => line.sku)];
    if (new Set(skus).size !== skus.length) {
      throw new AppError(400, "Un article ne peut figurer qu'une fois dans la commande");
    }
    // Retirer un article puis le rajouter par son SKU effacerait sa ligne et son prix d'achat copié
    // à la vente (le bénéfice passé changerait) : on garde sa ligne et on en change la quantité ou le prix.
    const alreadyThere = paying.find((item) => newLines.some((line) => line.sku === item.sku));
    if (alreadyThere) {
      throw new AppError(
        400,
        `« ${alreadyThere.name} » est déjà dans la commande : gardez sa ligne et changez sa quantité ou son prix`,
      );
    }

    // 2. Une commande avec des cadeaux ne change ni d'articles ni de quantités (décision du lot 2).
    if (gifts.length > 0) {
      const sameLines =
        newLines.length === 0 &&
        keptIds.size === paying.length &&
        input.lines.every((line) => "id" in line && paying.find((item) => item.id === line.id)?.quantity === line.quantity);
      if (!sameLines) {
        throw new AppError(409, "Cette commande contient des cadeaux : supprimez-la et refaites-la pour changer ses articles");
      }
    }

    // 3. Les nouveaux articles : fiche de la variante, prix d'achat du moment.
    const variants = await tx.productVariant.findMany({
      where: { sku: { in: newLines.map((line) => line.sku) } },
      include: { product: { select: { id: true, name: true } } },
    });
    const bySku = new Map(variants.map((variant) => [variant.sku, variant]));
    for (const line of newLines) {
      if (!bySku.has(line.sku)) throw new AppError(400, `Article inconnu : ${line.sku}`);
    }

    // 4. L'état d'après, ligne par ligne.
    const requested = new Map(input.lines.filter((line) => "id" in line).map((line) => [(line as { id: number }).id, line]));
    const after = [
      ...paying
        .filter((item) => keptIds.has(item.id))
        .map((item) => {
          const line = requested.get(item.id)!;
          return { sku: item.sku, name: item.name, quantity: line.quantity, unitPrice: line.unitPrice };
        }),
      ...newLines.map((line) => ({
        sku: line.sku,
        name: bySku.get(line.sku)!.product.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
    ];
    const before = paying.map((item) => ({ sku: item.sku, name: item.name, quantity: item.quantity, unitPrice: item.unitPrice }));

    // 5. Ce qui change vraiment (rien : on n'écrit rien, pas même une trace).
    const phrases = describeEdit(before, after);
    const coordinates: Record<string, string | null> = {};
    if (input.fullName !== undefined && input.fullName !== order.fullName) {
      phrases.push(`Nom : ${order.fullName} → ${input.fullName}`);
      coordinates.fullName = input.fullName;
    }
    if (input.phone !== undefined && input.phone !== order.phone) {
      phrases.push(`Téléphone : ${order.phone} → ${input.phone}`);
      coordinates.phone = input.phone;
    }
    if (input.note !== undefined && (input.note || null) !== order.note) {
      phrases.push("Remarque modifiée");
      coordinates.note = input.note || null;
    }

    // 6. L'argent : seulement ce qui a déjà été encaissé.
    const money = await paidByMethod(tx, id);
    if (input.method && !money.hasPayment) {
      throw new AppError(400, "Cette commande n'a pas encore été payée : il n'y a pas de moyen de paiement à changer");
    }
    const subtotal = after.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const total = subtotal + order.shippingFee;
    // Les montants sont des entiers de 32 bits dans la base : au-delà, PostgreSQL répondrait 500.
    if (total > MAX_TOTAL) {
      throw new AppError(400, "Le total de la commande est trop élevé");
    }
    let corrections: { method: PaymentMethod; amount: number }[] = [];
    if (money.hasPayment) {
      const method = input.method ?? mainMethod(money.paid);
      corrections = correctionMovements(money.paid, total, method);
      if (input.method && input.method !== mainMethod(money.paid)) {
        phrases.push(`Moyen de paiement : ${METHOD_LABELS[mainMethod(money.paid)]} → ${METHOD_LABELS[input.method]}`);
      }
    }
    if (phrases.length === 0 && corrections.length === 0) {
      return { id, total: order.total, status: order.status };
    }
    if (corrections.length > 0) {
      await requireOpenCashDay(tx, now);
    }

    // 7. Le stock : toujours dans le même ordre (par SKU) pour que deux transactions ne s'attendent pas.
    const deltas = stockDeltas(
      order.items.map((item) => ({ sku: item.sku, quantity: item.quantity })),
      [...after, ...gifts].map((line) => ({ sku: line.sku, quantity: line.quantity })),
    );
    const names = new Map([...order.items, ...after].map((line) => [line.sku, line.name]));
    for (const [sku, delta] of [...deltas].sort(([a], [b]) => a.localeCompare(b))) {
      if (delta > 0) {
        const { count } = await tx.productVariant.updateMany({
          where: { sku, stock: { gte: delta } },
          data: { stock: { decrement: delta } },
        });
        if (count !== 1) {
          throw new AppError(409, `Il n'en reste pas assez de « ${names.get(sku)} » en stock`);
        }
      } else {
        await tx.productVariant.updateMany({ where: { sku }, data: { stock: { increment: -delta } } });
      }
    }

    // 8. Les lignes : retirées, mises à jour (le prix d'achat copié ne bouge pas), ajoutées.
    await tx.orderItem.deleteMany({ where: { orderId: id, isGift: false, id: { notIn: [...keptIds] } } });
    for (const item of paying.filter((candidate) => keptIds.has(candidate.id))) {
      const line = requested.get(item.id)!;
      await tx.orderItem.update({ where: { id: item.id }, data: { quantity: line.quantity, unitPrice: line.unitPrice } });
    }
    for (const line of newLines) {
      const variant = bySku.get(line.sku)!;
      await tx.orderItem.create({
        data: {
          orderId: id,
          productId: variant.product.id,
          sku: variant.sku,
          name: variant.product.name,
          options: variant.options ?? {},
          condition: variant.condition,
          conditionReport: buildConditionReport(variant),
          warrantyMonths: variant.warrantyMonths,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          unitCost: variant.purchasePrice,
        },
      });
    }
    await tx.order.update({ where: { id }, data: { ...coordinates, subtotal, total } });

    // 9. L'argent corrigé et la trace.
    for (const movement of corrections) {
      await tx.moneyMovement.create({
        data: {
          businessDate: asDay(now),
          amount: movement.amount,
          method: movement.method,
          kind: "correction",
          orderId: id,
          userId,
          note: `Modification de la commande n° ${order.number}`,
        },
      });
    }
    await tx.orderEvent.create({
      data: {
        kind: "edited",
        orderId: id,
        orderNumber: order.number,
        userId,
        summary: phrases.join(" ; "),
        amountDelta: total - order.total,
      },
    });
    await refreshMinPrice(tx, [...order.items.map((item) => item.productId), ...variants.map((variant) => variant.product.id)]);
    return { id, total, status: order.status };
  });
}


// Supprimer une commande : le verrou de la ligne décide qui gagne si deux clics arrivent
// ensemble (le second ne trouve plus rien : 404). Le stock se rend sauf si la commande avait
// déjà été annulée ou avait expiré (elle l'a déjà rendu). L'argent déjà encaissé est rendu par
// un mouvement négatif du jour, par moyen de paiement ; la trace garde de quoi retrouver la
// commande (numéro, client, total) puisque la commande elle-même disparaît.
export async function deleteOrder(id: number, userId: number, now: Date = new Date()) {
  return prisma.$transaction(async (tx) => {
    await lockOrder(tx, id);
    const order = await tx.order.findUniqueOrThrow({ where: { id }, include: { items: true } });
    const money = await paidByMethod(tx, id);
    const refunds = (Object.entries(money.paid) as [PaymentMethod, number][]).filter(([, amount]) => amount !== 0);
    if (refunds.length > 0) {
      await requireOpenCashDay(tx, now);
    }

    if (order.status !== "cancelled" && order.status !== "expired") {
      await restockItems(tx, order.items);
    }
    for (const [method, amount] of refunds) {
      await tx.moneyMovement.create({
        data: {
          businessDate: asDay(now),
          amount: -amount,
          method,
          kind: "correction",
          orderId: id,
          userId,
          note: `Suppression de la commande n° ${order.number}`,
        },
      });
    }
    await tx.order.delete({ where: { id } });
    await tx.orderEvent.create({
      data: {
        kind: "deleted",
        orderId: id,
        orderNumber: order.number,
        userId,
        summary: `Commande supprimée : ${order.fullName}, ${groupThousands(order.total)} DA, ${order.items.length} ligne(s)`,
        amountDelta: -money.total,
      },
    });
    return { id, refunded: money.total };
  });
}
