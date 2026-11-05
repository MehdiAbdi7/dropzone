import { createHash } from "node:crypto";
import { prisma, type Tx } from "../../config/db.js";
import { computeShippingFee } from "../../config/shipping.js";
import type { Condition, OrderStatus, Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../utils/AppError.js";
import { paginate, paginationMeta } from "../../utils/pagination.js";
import { buildConditionReport, refreshMinPrice } from "../products/product.service.js";
import { sameColor } from "../models/modelColors.js";
import type { AdminOrderListQuery, CartItemInput, CreateOrderInput } from "./order.schema.js";

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
export async function priceCart(db: Tx, items: CartItemInput[]) {
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
    // Un reconditionné est unique : on ne peut pas en commander deux.
    const maxQuantity = variant.condition === "refurbished" ? 1 : MAX_QUANTITY;
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
  const shippingFee = computeShippingFee(subtotal);
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

export async function createOrder(input: CreateOrderInput, userId: number | undefined) {
  return prisma.$transaction(async (tx) => {
    const cart = await priceCart(tx, input.items);
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

    // La baisse conditionnelle : « seulement s'il en reste assez ». Deux clients qui
    // prennent le dernier article en même temps : PostgreSQL verrouille la ligne, le
    // second relit un stock à 0 et ne change rien (count = 0). Toujours dans le même
    // ordre (par SKU) pour que deux commandes ne s'attendent jamais l'une l'autre.
    const sorted = [...cart.lines].sort((a, b) => a.sku.localeCompare(b.sku));
    for (const line of sorted) {
      const { count } = await tx.productVariant.updateMany({
        where: { sku: line.sku, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (count !== 1) {
        throw new AppError(
          409,
          line.isGift
            ? `L'article offert « ${line.name} » vient d'être épuisé, vérifiez votre panier`
            : `Le stock de « ${line.name} » vient de changer, vérifiez votre panier`,
        );
      }
    }

    const order = await tx.order.create({
      data: {
        userId,
        fullName: input.fullName,
        phone: input.phone,
        wilaya: input.wilaya,
        commune: input.commune,
        address: input.address,
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
            quantity: line.quantity,
            isGift: line.isGift,
          })),
        },
      },
      select: { number: true, total: true, phone: true },
    });

    // Un reconditionné vendu : le « à partir de » de son produit change.
    await refreshMinPrice(tx, cart.lines.map((line) => line.productId));
    return order;
  });
}

// Ce que voit le client (suivi, espace compte) : pas l'id interne, pas l'adresse.
const orderDetailSelect = {
  number: true,
  status: true,
  createdAt: true,
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
  return order;
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
  return order;
}

// ---------- Admin ----------

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "en attente",
  confirmed: "confirmée",
  shipped: "expédiée",
  delivered: "livrée",
  cancelled: "annulée",
};

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export async function listAdminOrders(query: AdminOrderListQuery) {
  const filters: Prisma.OrderWhereInput[] = [];
  if (query.status) {
    filters.push({ status: query.status });
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
    },
  });
  if (!order) {
    throw new AppError(404, "Commande introuvable");
  }
  return { ...order, allowedTransitions: TRANSITIONS[order.status] };
}

export async function changeOrderStatus(id: number, next: OrderStatus) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) {
      throw new AppError(404, "Commande introuvable");
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
    if (next === "cancelled") {
      for (const item of order.items) {
        await tx.productVariant.updateMany({
          where: { sku: item.sku },
          data: { stock: { increment: item.quantity } },
        });
      }
      await refreshMinPrice(tx, order.items.map((item) => item.productId));
    }
    return { id, status: next, allowedTransitions: TRANSITIONS[next] };
  });
}
