import { createHash } from "node:crypto";
import { prisma, type Tx } from "../../config/db.js";
import { computeShippingFee } from "../../config/shipping.js";
import type { Condition, OrderStatus, PaymentMethod, Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../utils/AppError.js";
import { paginate, paginationMeta } from "../../utils/pagination.js";
import { buildConditionReport, refreshMinPrice } from "../products/product.service.js";
import { sameColor } from "../models/modelColors.js";
import { algiersDate, algiersMidnightAfter, pickupDays, pickupSlots } from "../../utils/algiersTime.js";
import { requireOpenCashDay } from "../cash/cash.service.js";
import { getReservationSettings, getStoreHours, getUnlimitedAdvance } from "../store/store.service.js";
import { issueDailyNumber } from "./dailyNumber.js";
import { priceReduction } from "./negotiation.js";
import { negotiateOrderPrices } from "./negotiation.service.js";
import { lockOrder } from "./orderLock.js";
import { STATUS_LABELS } from "./orderStatus.js";
import { orderProfit } from "./orderMath.js";
import { restockItems } from "./reservations.js";
import type { AdminOrderListQuery, CartItemInput, CreateOrderInput, Fulfillment } from "./order.schema.js";

const MAX_QUANTITY = 10;

// La photo de la couleur d'une ligne (option « Couleur »), si le modèle en a une.
function colorPhotoOf(variant: {
  options: unknown;
  product: { deviceModel: { colorPhotos: { color: string; url: string }[] } | null };
}): string | null {
  const color = (variant.options as Record<string, string> | null)?.Couleur;
  if (!color) return null;
  return variant.product.deviceModel?.colorPhotos.find((photo) => sameColor(photo.color, color))?.url ?? null;
}

export type CartLine = {
  sku: string;
  productId: number;
  name: string;
  slug: string;
  image: string | null;
  options: Prisma.JsonValue;
  condition: Condition;
  conditionReport: string | null;
  // La garantie en mois de l'appareil ; null pour un accessoire qui n'en annonce pas.
  warrantyMonths: number | null;
  unitPrice: number;
  // Le prix normal d'un article offert, pour l'afficher barré.
  normalPrice: number;
  quantity: number;
  maxQuantity: number;
  lineTotal: number;
  isGift: boolean;
  giftFor: string | null;
  problem: string | null;
};

// Le calcul du panier, partagé par l'aperçu (POST /orders/preview) et la commande :
// les deux voient exactement les mêmes prix, cadeaux et problèmes.
// `db` est le client normal ou celui d'une transaction.
// `fulfillment` : un réservation au magasin n'a pas de frais de livraison (14/11).
export async function priceCart(db: Tx, items: CartItemInput[], fulfillment: Fulfillment = "delivery") {
  // Le même SKU deux fois (deux onglets) : on additionne.
  const quantities = new Map<string, number>();
  for (const item of items) {
    quantities.set(item.sku, (quantities.get(item.sku) ?? 0) + item.quantity);
  }

  const image = { orderBy: { position: "asc" as const }, take: 1, select: { url: true } };
  const variants = await db.productVariant.findMany({
    where: { sku: { in: [...quantities.keys()] } },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          images: image,
          // La photo de la couleur de la ligne, si le gérant l'a mise (barre du panier, 05/11).
          deviceModel: { select: { colorPhotos: { select: { color: true, url: true } } } },
        },
      },
      gifts: {
        include: {
          giftVariant: {
            include: { product: { select: { id: true, name: true, slug: true, images: image } } },
          },
        },
      },
    },
  });
  const bySku = new Map(variants.map((variant) => [variant.sku, variant]));

  const lines: CartLine[] = [];
  const unavailable: string[] = [];
  const notices: string[] = [];
  const limitations: { sku: string; name: string; limitations: string[] }[] = [];

  for (const [sku, quantity] of quantities) {
    const variant = bySku.get(sku);
    if (!variant || variant.product.status !== "published") {
      unavailable.push(sku);
      continue;
    }
    const maxQuantity = MAX_QUANTITY;
    let problem: string | null = null;
    if (variant.stock === 0) {
      problem = "Rupture de stock";
    } else if (quantity > variant.stock) {
      problem = `Il n'en reste que ${variant.stock}`;
    } else if (quantity > maxQuantity) {
      problem = `Quantité maximale : ${maxQuantity}`;
    }

    lines.push({
      sku,
      productId: variant.product.id,
      name: variant.product.name,
      slug: variant.product.slug,
      image: colorPhotoOf(variant) ?? variant.product.images[0]?.url ?? null,
      options: variant.options,
      condition: variant.condition,
      conditionReport: buildConditionReport(variant),
      warrantyMonths: variant.warrantyMonths,
      unitPrice: variant.price,
      normalPrice: variant.price,
      quantity,
      maxQuantity: Math.min(maxQuantity, Math.max(variant.stock, 1)),
      lineTotal: variant.price * quantity,
      isGift: false,
      giftFor: null,
      problem,
    });

    if (variant.limitations.length > 0) {
      limitations.push({ sku, name: variant.product.name, limitations: variant.limitations });
    }

    // Les articles offerts de l'affaire, à 0 DA. Un cadeau épuisé n'est pas proposé :
    // le client le voit avant de confirmer.
    for (const gift of variant.gifts) {
      const giftQuantity = gift.quantity * quantity;
      if (gift.giftVariant.stock < giftQuantity) {
        notices.push(`« ${gift.giftVariant.product.name} » n'est plus offert avec « ${variant.product.name} » : il est épuisé.`);
        continue;
      }
      lines.push({
        sku: gift.giftVariant.sku,
        productId: gift.giftVariant.product.id,
        name: gift.giftVariant.product.name,
        slug: gift.giftVariant.product.slug,
        image: gift.giftVariant.product.images[0]?.url ?? null,
        options: gift.giftVariant.options,
        condition: "new",
        conditionReport: null,
        warrantyMonths: gift.giftVariant.warrantyMonths,
        unitPrice: 0,
        normalPrice: gift.giftVariant.price,
        quantity: giftQuantity,
        maxQuantity: giftQuantity,
        lineTotal: 0,
        isGift: true,
        giftFor: sku,
        problem: null,
      });
    }
  }

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const shippingFee = fulfillment === "pickup" ? 0 : computeShippingFee(subtotal);
  const canOrder = lines.length > 0 && unavailable.length === 0 && lines.every((line) => !line.problem);

  return {
    lines,
    unavailable,
    notices,
    limitations,
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
    canOrder,
    cartHash: hashLines(lines),
  };
}

// L'empreinte de ce que le client a vu : chaque ligne (cadeaux compris) avec sa
// quantité, son prix, sa garantie et sa fiche d'état, tout ce que la commande recopie.
// La commande renvoie l'empreinte de l'aperçu ; si le serveur en calcule une autre
// (prix ou garantie modifiés, fiche réécrite, cadeau épuisé), la commande est refusée.
function hashLines(lines: CartLine[]): string {
  const text = lines
    .map((line) => JSON.stringify([line.sku, line.quantity, line.unitPrice, line.warrantyMonths, line.conditionReport]))
    .sort()
    .join("|");
  return createHash("sha256").update(text).digest("hex");
}

// L'aperçu du panier (POST /orders/preview) : ce que le client voit avant de commander.
export async function previewCart(items: CartItemInput[], fulfillment: Fulfillment = "delivery") {
  return priceCart(prisma, items, fulfillment);
}

// Le jour et la fin de réservation d'un retrait, après vérification du créneau : le serveur fait
// foi (un créneau passé entre l'affichage du formulaire et l'envoi est refusé).
// Partagé avec la commande prise par téléphone (19/11) : seuls le jour et l'heure comptent.
export async function pickupSlot(tx: Tx, input: { pickupDate?: string; pickupTime?: string }, now: Date) {
  // Le schéma exige déjà le jour et l'heure d'une réservation de deux jours ; ceci rassure TypeScript.
  if (!input.pickupDate || !input.pickupTime) {
    throw new AppError(400, "Choisissez le jour et l'heure de votre passage");
  }
  const hours = await getStoreHours(tx);
  // Le jour doit être l'un des deux que le formulaire proposait, puis l'heure l'un de ses créneaux.
  if (!pickupDays(hours, now).includes(input.pickupDate) || !pickupSlots(hours, input.pickupDate, now).includes(input.pickupTime)) {
    throw new AppError(400, "Ce créneau n'est pas disponible");
  }
  return {
    pickupDate: new Date(`${input.pickupDate}T00:00:00Z`),
    pickupTime: input.pickupTime,
    reservedUntil: algiersMidnightAfter(input.pickupDate),
  };
}

// La baisse conditionnelle du stock : « seulement s'il en reste assez ». Deux clients qui prennent
// le dernier article en même temps : PostgreSQL verrouille la ligne, le second relit un stock à 0 et
// ne change rien (count = 0). Toujours dans le même ordre (par SKU) pour que deux commandes ne
// s'attendent jamais l'une l'autre. Partagée par la commande du site et la vente au magasin.
export async function takeStock(
  tx: Tx,
  lines: { sku: string; quantity: number; isGift: boolean; name: string }[],
  where: string,
) {
  for (const line of [...lines].sort((a, b) => a.sku.localeCompare(b.sku))) {
    const { count } = await tx.productVariant.updateMany({
      where: { sku: line.sku, stock: { gte: line.quantity } },
      data: { stock: { decrement: line.quantity } },
    });
    if (count !== 1) {
      throw new AppError(
        409,
        line.isGift
          ? `L'article offert « ${line.name} » vient d'être épuisé, vérifiez ${where}`
          : `Le stock de « ${line.name} » vient de changer, vérifiez ${where}`,
      );
    }
  }
}

// Le prix d'achat du moment, figé sur chaque ligne vendue (14/11) : lu ici et jamais par
// priceCart, qui sert aussi l'aperçu public.
export async function variantCosts(tx: Tx, skus: string[]): Promise<Map<string, number | null>> {
  const variants = await tx.productVariant.findMany({
    where: { sku: { in: skus } },
    select: { sku: true, purchasePrice: true },
  });
  return new Map(variants.map((variant) => [variant.sku, variant.purchasePrice]));
}

export async function createOrder(input: CreateOrderInput, userId: number | undefined) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    // Deux jours : un créneau vérifié. Illimitée : pas de date, mais l'avance doit être réglée (18/11).
    const unlimited = input.fulfillment === "pickup" && input.reservationMode === "unlimited";
    const advance = unlimited ? await getUnlimitedAdvance(tx) : null;
    if (unlimited && advance === null) {
      throw new AppError(400, "La réservation illimitée n'est pas disponible pour le moment");
    }
    const pickup =
      input.fulfillment !== "pickup"
        ? null
        : unlimited
          ? { pickupDate: null, pickupTime: null, reservedUntil: null, reservationMode: "unlimited" as const, advanceAmount: advance }
          : { ...(await pickupSlot(tx, input, now)), reservationMode: "two_days" as const, advanceAmount: null };
    const cart = await priceCart(tx, input.items, input.fulfillment);
    if (!cart.canOrder) {
      throw new AppError(409, "Votre panier a changé, vérifiez-le avant de commander", {
        unavailable: cart.unavailable,
        problems: cart.lines.filter((line) => line.problem).map((line) => ({ sku: line.sku, problem: line.problem })),
      });
    }
    // Le client confirme toujours ce qu'il a vu (loi 18-05, art. 12).
    if (cart.cartHash !== input.cartHash) {
      throw new AppError(409, "Votre panier a changé depuis le récapitulatif, vérifiez-le avant de commander");
    }
    if (cart.limitations.length > 0 && !input.acceptLimitations) {
      throw new AppError(400, "Acceptez les limitations des appareils reconditionnés de votre commande");
    }

    await takeStock(tx, cart.lines, "votre panier");

    // Le numéro du jour, dans la même transaction : une commande refusée plus haut n'en prend pas.
    const { dailyNumber, businessDate } = await issueDailyNumber(tx, now);
    const costs = await variantCosts(tx, cart.lines.map((line) => line.sku));
    const order = await tx.order.create({
      data: {
        userId,
        dailyNumber,
        businessDate,
        fullName: input.fullName,
        phone: input.phone,
        ...(input.fulfillment === "delivery"
          ? { type: "delivery" as const, wilaya: input.wilaya, commune: input.commune, address: input.address }
          : { type: "pickup" as const, status: "reserved" as const, ...pickup }),
        note: input.note,
        subtotal: cart.subtotal,
        shippingFee: cart.shippingFee,
        total: cart.total,
        limitationsAccepted: cart.limitations.length > 0,
        // Les articles recopiés : une commande est un fait passé.
        items: {
          create: cart.lines.map((line) => ({
            productId: line.productId,
            sku: line.sku,
            name: line.name,
            options: line.options ?? {},
            condition: line.condition,
            conditionReport: line.conditionReport,
            warrantyMonths: line.warrantyMonths,
            unitPrice: line.unitPrice,
            // Le prix catalogue du moment (lot 3) : une négociation ultérieure s'y compare. Un
            // cadeau n'a pas de prix catalogue à montrer.
            listPrice: line.isGift ? null : line.unitPrice,
            quantity: line.quantity,
            isGift: line.isGift,
            unitCost: costs.get(line.sku) ?? null,
          })),
        },
      },
      select: {
        number: true,
        dailyNumber: true,
        total: true,
        phone: true,
        type: true,
        pickupDate: true,
        pickupTime: true,
        reservationMode: true,
        advanceAmount: true,
      },
    });

    // Un reconditionné vendu : le « à partir de » de son produit change.
    await refreshMinPrice(tx, cart.lines.map((line) => line.productId));
    return withPickupDay(order);
  });
}

// Le jour du retrait en texte (« 2026-11-15 ») : une date sans heure, lue telle quelle par le
// front, sans décalage de fuseau.
export function withPickupDay<T extends { pickupDate: Date | null }>(order: T) {
  return { ...order, pickupDate: order.pickupDate ? order.pickupDate.toISOString().slice(0, 10) : null };
}

// Ce que voit le client (suivi, espace compte) : pas l'id interne, pas l'adresse.
const orderDetailSelect = {
  number: true,
  status: true,
  createdAt: true,
  type: true,
  dailyNumber: true,
  pickupDate: true,
  pickupTime: true,
  // La réservation illimitée (18/11) : l'avance, le numéro BaridiMob (null tant que le magasin ne l'a pas
  // envoyé : il n'est écrit sur la commande qu'à ce moment) et l'avance reçue.
  reservationMode: true,
  advanceAmount: true,
  baridiNumber: true,
  baridiSharedAt: true,
  advancePaidAt: true,
  subtotal: true,
  shippingFee: true,
  total: true,
  wilaya: true,
  commune: true,
  items: {
    orderBy: { id: "asc" as const },
    select: {
      sku: true,
      name: true,
      options: true,
      condition: true,
      conditionReport: true,
      warrantyMonths: true,
      unitPrice: true,
      quantity: true,
      isGift: true,
      product: { select: { slug: true } },
    },
  },
} satisfies Prisma.OrderSelect;

// Même réponse que le numéro soit faux ou le téléphone : on ne dit pas lequel.
export async function trackOrder(number: number, phone: string) {
  const order = await prisma.order.findFirst({
    where: { number, phone },
    select: orderDetailSelect,
  });
  if (!order) {
    throw new AppError(404, "Aucune commande ne correspond à ce numéro et ce téléphone");
  }
  return withPickupDay(order);
}

export async function listMyOrders(userId: number) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { number: true, status: true, createdAt: true, total: true, _count: { select: { items: true } } },
  });
}

// La commande d'un autre client répond 404, pas 403 : on ne confirme pas qu'elle existe.
export async function getMyOrder(userId: number, number: number) {
  const order = await prisma.order.findFirst({
    where: { userId, number },
    select: { ...orderDetailSelect, fullName: true, phone: true, address: true, note: true },
  });
  if (!order) {
    throw new AppError(404, "Commande introuvable");
  }
  return withPickupDay(order);
}

// ---------- Admin ----------

export { STATUS_LABELS };

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  // Un colis refusé revient : « Retournée » (stock remis, rien d'encaissé) depuis Expédiée ou Livrée.
  // « Encaissée » n'est pas un simple changement d'état : elle écrit l'argent (voir collectDelivery).
  shipped: ["delivered", "returned"],
  delivered: ["collected", "returned"],
  cancelled: [],
  // Un retrait réservé ne passe « récupérée » que par validatePickup (avec son paiement) ;
  // à la main, on peut seulement l'annuler (le stock revient). Expirée : par releaseExpiredReservations.
  reserved: ["cancelled"],
  picked_up: [],
  expired: [],
  collected: [],
  returned: [],
};

// Une livraison en cours : confirmée, expédiée, ou livrée en attente d'encaissement.
const ONGOING_STATUSES: OrderStatus[] = ["confirmed", "shipped", "delivered"];

export async function listAdminOrders(query: AdminOrderListQuery) {
  // Le remplacement d'un appareil sous garantie (atelier, étape 6) vit dans sa fiche, pas dans les commandes.
  const filters: Prisma.OrderWhereInput[] = [{ replacementOf: { is: null } }];
  if (query.status) {
    filters.push({ status: query.status });
  }
  if (query.stage) {
    filters.push({ status: query.stage === "new" ? "pending" : { in: ONGOING_STATUSES } });
  }
  if (query.type) {
    filters.push({ type: query.type });
  }
  if (query.q) {
    const number = Number(query.q);
    filters.push({
      OR: [
        ...(Number.isInteger(number) ? [{ number }] : []),
        { phone: { contains: query.q.replace(/\s/g, "") } },
        { fullName: { contains: query.q, mode: "insensitive" } },
      ],
    });
  }
  const where: Prisma.OrderWhereInput = { AND: filters };
  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginate(query.page, query.limit),
      select: {
        id: true,
        number: true,
        type: true,
        dailyNumber: true,
        businessDate: true,
        pickupDate: true,
        pickupTime: true,
        reservationMode: true,
        advanceAmount: true,
        baridiSharedAt: true,
        advancePaidAt: true,
        fullName: true,
        phone: true,
        wilaya: true,
        total: true,
        status: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
  ]);
  return { data: orders, pagination: paginationMeta(query.page, query.limit, total) };
}

export async function getAdminOrder(id: number) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { orderBy: { id: "asc" } },
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      // Le téléphone repris d'un échange (lot 5) ; null pour toute autre commande.
      tradeIn: { include: { deviceModel: { select: { id: true, brand: true, name: true } } } },
    },
  });
  if (!order) {
    throw new AppError(404, "Commande introuvable");
  }
  // L'argent de la commande et ses traces (lot 2) : réservés au back-office, jamais au suivi du client.
  const [payments, events] = await Promise.all([
    prisma.moneyMovement.findMany({ where: { orderId: id }, orderBy: { id: "asc" } }),
    prisma.orderEvent.findMany({ where: { orderId: id }, orderBy: { id: "desc" } }),
  ]);
  // Qui a accordé chaque prix négocié (lot 3) : le nom, pour l'afficher à côté de la réduction.
  const grantors = await prisma.user.findMany({
    where: { id: { in: order.items.map((item) => item.grantedById).filter((value): value is number => value !== null) } },
    select: { id: true, firstName: true, lastName: true },
  });
  const grantorName = (userId: number | null) => {
    const user = grantors.find((candidate) => candidate.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : null;
  };
  return {
    ...order,
    items: order.items.map((item) => ({ ...item, grantedByName: grantorName(item.grantedById) })),
    allowedTransitions: TRANSITIONS[order.status],
    payments,
    paid: payments.reduce((sum, movement) => sum + movement.amount, 0),
    profit: orderProfit(order.items),
    discount: priceReduction(order.items),
    events,
  };
}

// `prices` : les prix négociés (16/11, lot 3), acceptés seulement avec la confirmation d'une livraison.
export async function changeOrderStatus(
  id: number,
  next: OrderStatus,
  userId: number,
  prices?: { id: number; unitPrice: number }[],
) {
  if (prices && prices.length > 0 && next !== "confirmed") {
    throw new AppError(400, "Les prix ne se négocient qu'à la confirmation de la commande");
  }
  return prisma.$transaction(async (tx) => {
    // Le verrou d'abord : une modification qui passe en même temps (lot 2) change les lignes, et
    // l'annulation doit rendre au stock les lignes d'APRÈS, pas celles qu'elle aurait lues avant.
    await lockOrder(tx, id);
    const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) {
      throw new AppError(404, "Commande introuvable");
    }
    // « Récupérée » encaisse de l'argent : jamais par un simple changement d'état.
    if (next === "picked_up") {
      throw new AppError(409, "Validez la réservation avec son moyen de paiement");
    }
    // « Encaissée » aussi : l'argent s'écrit avec son moyen de paiement (collectDelivery).
    if (next === "collected") {
      throw new AppError(409, "Encaissez la livraison avec son moyen de paiement");
    }
    // « Retournée » : DropZone paie le retour, le montant se saisit (returnDelivery).
    if (next === "returned") {
      throw new AppError(409, "Marquez la livraison retournée en indiquant les frais de retour");
    }
    if (!TRANSITIONS[order.status].includes(next)) {
      throw new AppError(
        409,
        `Une commande ${STATUS_LABELS[order.status]} ne peut pas passer à « ${STATUS_LABELS[next]} »`,
      );
    }
    // Mise à jour conditionnelle : si un autre onglet vient de changer le statut,
    // rien ne bouge (count = 0). Une annulation ne rend donc le stock qu'une fois.
    const { count } = await tx.order.updateMany({
      where: { id, status: order.status },
      data: { status: next },
    });
    if (count !== 1) {
      throw new AppError(409, "La commande vient d'être modifiée, rechargez la page");
    }
    // Annulée : les articles, cadeaux compris, reviennent en stock.
    if (next === "cancelled") {
      await restockItems(tx, order.items);
    }
    // La confirmation d'une livraison est le moment de négocier le prix (le magasin a appelé le client).
    if (prices && prices.length > 0) {
      await negotiateOrderPrices(tx, id, prices, userId);
    }
    return { id, status: next, allowedTransitions: TRANSITIONS[next] };
  });
}

// Valider un retrait au comptoir (14/11) : le client est venu et a payé. La commande passe
// « récupérée » et le paiement entre dans le journal, à la date du jour : il compte dans la
// caisse de ce jour-là (en espèces) ou dans le total du jour (autres moyens).
// `prices` : les prix négociés (lot 3), appliqués avant d'encaisser le nouveau total.
export async function validatePickup(
  id: number,
  method: PaymentMethod,
  userId: number,
  prices?: { id: number; unitPrice: number }[],
  now: Date = new Date(),
) {
  return prisma.$transaction(async (tx) => {
    await requireOpenCashDay(tx, now);
    // Conditionnelle : un deuxième clic, ou l'expiration de minuit, a pu passer avant. Seul
    // l'appel qui fait passer la commande de « réservée » à « récupérée » encaisse.
    const { count } = await tx.order.updateMany({
      // Une réservation illimitée n'a pas de date limite (reservedUntil null) : elle ne s'expire jamais.
      where: { id, type: "pickup", status: "reserved", OR: [{ reservedUntil: { gt: now } }, { reservedUntil: null }] },
      data: { status: "picked_up" },
    });
    if (count !== 1) {
      const order = await tx.order.findUnique({ where: { id }, select: { type: true, status: true } });
      if (!order) throw new AppError(404, "Commande introuvable");
      if (order.type !== "pickup") throw new AppError(409, "Cette commande n'est pas un réservation au magasin");
      throw new AppError(409, `Cette réservation est déjà ${STATUS_LABELS[order.status]}`);
    }
    // Négocier AVANT de lire le total : l'argent encaissé est le prix accordé. La commande vient d'être
    // marquée « récupérée » mais rien n'est encore écrit dans le journal : c'est le seul moment où
    // une négociation sur un retrait « récupéré » est permise.
    if (prices && prices.length > 0) {
      await negotiateOrderPrices(tx, id, prices, userId, ["reserved", "picked_up"]);
    }
    const order = await tx.order.findUniqueOrThrow({
      where: { id },
      select: { total: true, advanceAmount: true, advancePaidAt: true },
    });
    // L'avance BaridiMob reçue plus tôt est déjà dans l'argent : le client ne paie que le reste.
    const alreadyPaid = order.advancePaidAt ? (order.advanceAmount ?? 0) : 0;
    await tx.moneyMovement.create({
      data: {
        businessDate: new Date(`${algiersDate(now)}T00:00:00Z`),
        amount: order.total - alreadyPaid,
        method,
        kind: "pickup",
        orderType: "pickup",
        orderId: id,
        userId,
      },
    });
    return { id, status: "picked_up" as const, allowedTransitions: TRANSITIONS.picked_up };
  });
}

// Le colis revient (17/11) : le client l'a refusé, ou n'a pas répondu à la société de livraison.
// Les articles, cadeaux compris, reviennent en stock et se remettent en vente tout seuls. DropZone
// paie le retour : `fee` est le montant de la société (il dépend de la wilaya et de la société, donc
// l'admin le saisit à chaque retour). Il s'écrit en NÉGATIF dans le journal, à la date du retour,
// hors caisse (type livraison) : il se retranche de l'argent des livraisons et du bénéfice.
// Possible depuis « Expédiée » ou « Livrée » ; jamais une fois encaissée.
export async function returnDelivery(id: number, fee: number, method: PaymentMethod, userId: number, now: Date = new Date()) {
  return prisma.$transaction(async (tx) => {
    await lockOrder(tx, id);
    const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new AppError(404, "Commande introuvable");
    if (order.type !== "delivery") throw new AppError(409, "Cette commande n'est pas une livraison");
    if (order.status !== "shipped" && order.status !== "delivered") {
      throw new AppError(409, `Une livraison ${STATUS_LABELS[order.status]} ne peut pas être marquée retournée : elle doit être expédiée ou livrée`);
    }
    // Conditionnelle : un autre onglet a pu passer avant, le stock ne revient qu'une fois.
    const { count } = await tx.order.updateMany({ where: { id, status: order.status }, data: { status: "returned" } });
    if (count !== 1) throw new AppError(409, "La commande vient d'être modifiée, rechargez la page");
    await restockItems(tx, order.items);
    if (fee > 0) {
      await tx.moneyMovement.create({
        data: {
          businessDate: new Date(`${algiersDate(now)}T00:00:00Z`),
          amount: -fee,
          method,
          kind: "return_fee",
          orderType: "delivery",
          orderId: id,
          userId,
          note: `Frais de retour de la commande n° ${order.number}`,
        },
      });
    }
    return { id, status: "returned" as const, allowedTransitions: TRANSITIONS.returned };
  });
}

// Encaisser une livraison livrée (17/11, lot 4) : l'argent est arrivé (la société de livraison l'a
// reversé, ou le client a payé le livreur). Le mouvement est daté du jour de l'encaissement, pas de
// la commande : c'est ce jour-là que l'historique le compte. Il n'entre JAMAIS dans la caisse du
// magasin (le tiroir ne reçoit pas cet argent) : pas de journée de caisse exigée.
export async function collectDelivery(id: number, method: PaymentMethod, userId: number, now: Date = new Date()) {
  return prisma.$transaction(async (tx) => {
    // Conditionnelle : un deuxième clic, ou un autre onglet, a pu passer avant. Seul l'appel qui
    // fait passer la commande de « livrée » à « encaissée » écrit l'argent.
    const { count } = await tx.order.updateMany({
      where: { id, type: "delivery", status: "delivered" },
      data: { status: "collected" },
    });
    if (count !== 1) {
      const order = await tx.order.findUnique({ where: { id }, select: { type: true, status: true } });
      if (!order) throw new AppError(404, "Commande introuvable");
      if (order.type !== "delivery") throw new AppError(409, "Cette commande n'est pas une livraison");
      if (order.status === "collected") throw new AppError(409, "Cette livraison est déjà encaissée");
      throw new AppError(409, `Une livraison ${STATUS_LABELS[order.status]} ne peut pas être encaissée : elle doit d'abord être livrée`);
    }
    const order = await tx.order.findUniqueOrThrow({ where: { id }, select: { total: true } });
    await tx.moneyMovement.create({
      data: {
        businessDate: new Date(`${algiersDate(now)}T00:00:00Z`),
        amount: order.total,
        method,
        kind: "delivery",
        orderType: "delivery",
        orderId: id,
        userId,
      },
    });
    return { id, status: "collected" as const, allowedTransitions: TRANSITIONS.collected };
  });
}

// La réservation illimitée avec avance BaridiMob (18/11). Le client a commandé, le magasin l'a appelé : le
// bouton « Envoyer le numéro BaridiMob » copie le numéro des réglages SUR la commande (si l'admin le change
// ensuite, ce client garde celui qu'on lui a donné) et le rend visible dans son suivi. Conditionnelle : un
// deuxième clic, ou un autre onglet, ne l'envoie pas deux fois.
export async function shareBaridiNumber(id: number, now: Date = new Date()) {
  return prisma.$transaction(async (tx) => {
    const { baridiNumber } = await getReservationSettings(tx);
    if (baridiNumber.trim() === "") {
      throw new AppError(409, "Renseignez d'abord le numéro BaridiMob dans Réglages");
    }
    const { count } = await tx.order.updateMany({
      where: { id, type: "pickup", status: "reserved", reservationMode: "unlimited", baridiSharedAt: null },
      data: { baridiNumber, baridiSharedAt: now },
    });
    if (count !== 1) {
      await explainNotUnlimited(tx, id, "Le numéro BaridiMob a déjà été envoyé à ce client");
    }
    return { id, baridiNumber, baridiSharedAt: now };
  });
}

// L'avance reçue (18/11) : le magasin a vu le virement. La réservation reste « réservée » (elle passe « en cours »
// dans la liste) et l'avance entre dans l'argent du jour en BaridiMob, hors du tiroir. Pas besoin de journée de
// caisse ouverte : comme l'argent d'une livraison, ce n'est pas de l'argent liquide du tiroir. Une seule fois.
export async function receiveAdvance(id: number, userId: number, now: Date = new Date()) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: {
        id,
        type: "pickup",
        status: "reserved",
        reservationMode: "unlimited",
        baridiSharedAt: { not: null },
        advancePaidAt: null,
      },
      data: { advancePaidAt: now },
    });
    if (count !== 1) {
      await explainNotUnlimited(tx, id, "L'avance de cette réservation est déjà reçue, ou le numéro BaridiMob n'a pas encore été envoyé");
    }
    const order = await tx.order.findUniqueOrThrow({ where: { id }, select: { advanceAmount: true } });
    await tx.moneyMovement.create({
      data: {
        businessDate: new Date(`${algiersDate(now)}T00:00:00Z`),
        amount: order.advanceAmount ?? 0,
        method: "baridimob",
        kind: "pickup",
        orderType: "pickup",
        orderId: id,
        userId,
        note: "Avance de la réservation",
      },
    });
    return { id, advancePaidAt: now };
  });
}

// Dit pourquoi la mise à jour conditionnelle n'a rien changé : commande inconnue, pas une réservation
// illimitée, plus réservée, ou déjà faite (`already`).
async function explainNotUnlimited(tx: Tx, id: number, already: string): Promise<never> {
  const order = await tx.order.findUnique({ where: { id }, select: { type: true, status: true, reservationMode: true } });
  if (!order) throw new AppError(404, "Commande introuvable");
  if (order.type !== "pickup" || order.reservationMode !== "unlimited") {
    throw new AppError(409, "Cette commande n'est pas une réservation illimitée");
  }
  if (order.status !== "reserved") {
    throw new AppError(409, `Cette réservation est ${STATUS_LABELS[order.status]}`);
  }
  throw new AppError(409, already);
}
