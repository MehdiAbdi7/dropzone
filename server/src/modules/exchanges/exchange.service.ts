import { prisma, type Tx } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { algiersDate } from "../../utils/algiersTime.js";
import { requireOpenCashDay } from "../cash/cash.service.js";
import { unitBodySchema } from "../models/modelColors.schema.js";
import { addUnit } from "../models/modelColorsAdmin.service.js";
import { issueDailyNumber } from "../orders/dailyNumber.js";
import { takeStock, variantCosts } from "../orders/order.service.js";
import { MAX_TOTAL, priceTicket, ticketItems } from "../orders/ticket.service.js";
import { refreshMinPrice } from "../products/product.service.js";
import type { ExchangeInput, UpdateTradeInInput } from "./exchange.schema.js";

// Un échange (lot 5, 15/11) : le client rend un téléphone (la reprise, au prix que le magasin choisit
// à la main) et en prend un autre. Tout se fait dans UNE transaction, sur le modèle de la vente au
// magasin : le ticket de ce que le magasin donne se calcule comme celui d'une vente (même fonction),
// le stock sort, la commande est de type `exchange`, et le journal reçoit UN mouvement `exchange` égal
// à la différence : positive quand le client paie, négative quand le magasin rend de l'argent. La
// reprise n'entre PAS dans le catalogue : elle attend dans `trade_ins` jusqu'à sa mise en vente.
// Le modèle repris doit être un modèle de notre catalogue, et pouvoir recevoir son affaire : une fiche
// existe déjà, ou une série pour la créer (même règle que l'ajout d'un exemplaire dans le Catalogue). Partagée
// avec le remplacement sous garantie (atelier, étape 6), dont l'appareil en panne devient une reprise.
export async function requireTradeInModel(tx: Tx, deviceModelId: number) {
  const model = await tx.deviceModel.findUnique({
    where: { id: deviceModelId },
    select: { id: true, name: true, series: { select: { id: true } }, products: { select: { id: true }, take: 1 } },
  });
  if (!model) {
    throw new AppError(400, "Ce modèle n'existe pas dans le catalogue");
  }
  if (model.products.length === 0 && !model.series) {
    throw new AppError(400, `« ${model.name} » n'a ni fiche ni série : rangez-le dans une série du catalogue avant de le reprendre`);
  }
}

export async function createExchange(input: ExchangeInput, userId: number, now: Date = new Date()) {
  return prisma.$transaction(async (tx) => {
    await requireOpenCashDay(tx, now);
    await requireTradeInModel(tx, input.tradeIn.deviceModelId);

    const ticket = await priceTicket(tx, input.lines, input.acceptLimitations);
    const { cart, priced } = ticket;
    const { deviceModelId, color, price, ...sheet } = input.tradeIn;

    // Ce que le client paie (positif) ou ce que le magasin lui rend (négatif).
    const difference = priced.subtotal - price;
    if (Math.abs(difference) > MAX_TOTAL) {
      throw new AppError(400, "La différence de l'échange est trop élevée");
    }

    await takeStock(tx, cart.lines, "le ticket");
    const { dailyNumber, businessDate } = await issueDailyNumber(tx, now);
    const costs = await variantCosts(tx, cart.lines.map((line) => line.sku));

    const order = await tx.order.create({
      data: {
        dailyNumber,
        businessDate,
        type: "exchange",
        status: "picked_up",
        fullName: input.fullName,
        phone: input.phone,
        note: input.note,
        subtotal: priced.subtotal,
        shippingFee: 0,
        total: priced.subtotal,
        limitationsAccepted: cart.limitations.length > 0,
        items: { create: ticketItems(ticket, costs, userId) },
        tradeIn: { create: { deviceModelId, color, price, sheet } },
      },
      select: { id: true, number: true, dailyNumber: true, total: true, status: true, tradeIn: { select: { id: true } } },
    });

    // Un mouvement même à 0 DA : c'est lui qui dit « payé » (voir editOrder).
    await tx.moneyMovement.create({
      data: {
        businessDate: new Date(`${algiersDate(now)}T00:00:00Z`),
        amount: difference,
        method: input.method,
        kind: "exchange",
        orderType: "exchange",
        orderId: order.id,
        userId,
      },
    });
    await refreshMinPrice(tx, cart.lines.map((line) => line.productId));
    const { tradeIn, ...rest } = order;
    return { ...rest, difference, tradeInId: tradeIn!.id, notices: cart.notices };
  });
}

// Les reprises : à mettre en vente (par défaut) ou déjà en vente. La plus ancienne d'abord pour celles
// qui attendent (on les met en vente dans l'ordre), la plus récente d'abord pour les autres.
export async function listTradeIns(status: "pending" | "listed") {
  const rows = await prisma.tradeIn.findMany({
    where: { listedAt: status === "listed" ? { not: null } : null },
    orderBy: { id: status === "listed" ? "desc" : "asc" },
    include: {
      deviceModel: { select: { id: true, brand: true, name: true, kind: true } },
      order: { select: { number: true, dailyNumber: true, fullName: true, phone: true, businessDate: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    orderId: row.orderId,
    orderNumber: row.order.number,
    dailyNumber: row.order.dailyNumber,
    businessDate: row.order.businessDate.toISOString().slice(0, 10),
    customerName: row.order.fullName,
    customerPhone: row.order.phone,
    deviceModel: row.deviceModel,
    color: row.color,
    price: row.price,
    repairCost: row.repairCost,
    sheet: row.sheet,
    createdAt: row.createdAt,
    listedAt: row.listedAt,
    listedVariantId: row.listedVariantId,
  }));
}

// Mettre une reprise en vente : l'admin fixe le prix de revente, et la reprise devient une affaire dans
// la fiche de son modèle (même fonction que l'ajout d'un exemplaire depuis la page d'une couleur). Le
// prix de reprise devient son prix d'achat : le bénéfice de sa revente en découle. Dans UNE
// transaction, la ligne verrouillée : deux clics ne créent jamais deux affaires.
export async function updateTradeIn(id: number, input: UpdateTradeInInput) {
  return prisma.$transaction(async (tx) => {
    const [row] = await tx.$queryRaw<{ listed_at: Date | null }[]>`SELECT listed_at FROM trade_ins WHERE id = ${id} FOR UPDATE`;
    if (!row) {
      throw new AppError(404, "Reprise introuvable");
    }
    // Une reprise déjà en vente est devenue une affaire du catalogue : on la modifie là-bas.
    if (row.listed_at) {
      throw new AppError(409, "Cette reprise est déjà en vente : modifiez l'affaire dans le Catalogue");
    }
    const { color, repairCost, ...sheet } = input;
    await tx.tradeIn.update({ where: { id }, data: { color, repairCost, sheet } });
    return { id };
  });
}

export async function publishTradeIn(id: number, price: number, now: Date = new Date()) {
  return prisma.$transaction(async (tx) => {
    const [row] = await tx.$queryRaw<{ listed_at: Date | null }[]>`SELECT listed_at FROM trade_ins WHERE id = ${id} FOR UPDATE`;
    if (!row) {
      throw new AppError(404, "Reprise introuvable");
    }
    if (row.listed_at) {
      throw new AppError(409, "Cette reprise est déjà en vente");
    }
    const tradeIn = await tx.tradeIn.findUniqueOrThrow({ where: { id } });
    const { options, ...sheet } = tradeIn.sheet as { options?: Record<string, string> } & Record<string, unknown>;
    // La fiche a été validée à l'échange : elle repasse par le même schéma que l'ajout d'un exemplaire.
    const unit = unitBodySchema.parse({
      ...sheet,
      sku: `REP-${id}`,
      options: options ?? {},
      color: tradeIn.color,
      condition: "refurbished",
      price,
      // Reprise + remise en état : ce que l'affaire a réellement coûté au magasin.
      purchasePrice: tradeIn.price + tradeIn.repairCost,
      stock: 1,
    });
    const { productId, variantId } = await addUnit(tradeIn.deviceModelId, unit, tx);
    await tx.tradeIn.update({ where: { id }, data: { listedAt: now, listedVariantId: variantId } });
    return { id, productId, variantId, sku: `REP-${id}` };
  });
}
