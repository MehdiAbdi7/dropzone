import { prisma } from "../../config/db.js";
import type { MovementKind, PaymentMethod, Prisma } from "../../generated/prisma/client.js";
import { priceReduction } from "../orders/negotiation.js";
import { orderProfit } from "../orders/orderMath.js";
import type { HistoryQuery } from "./history.schema.js";

// L'historique d'une période (15/11, lot 2). Deux dates à ne pas confondre :
//  - l'ARGENT compte à la date de chaque mouvement du journal (`business_date`) : une correction
//    compte le jour où elle est écrite, jamais dans le passé ;
//  - une VENTE (et son bénéfice) compte à la date de son premier paiement. Une réservation faite
//    le 12 et payée le 14 est une vente du 14.
// Le SQL est écrit à la main (GROUP BY, bool_or) : c'est lui qu'on explique en entretien.

const METHODS: PaymentMethod[] = ["cash", "baridimob", "ccp", "card", "transfer"];
const KINDS: MovementKind[] = ["sale", "pickup", "delivery", "exchange", "correction"];
const MAX_ORDERS = 500;
const HOUR = 60 * 60 * 1000;

const emptyBy = <K extends string>(keys: K[]) => Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
const asDay = (iso: string) => new Date(`${iso}T00:00:00Z`);
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

export async function getHistory(query: HistoryQuery) {
  const { from, to } = query;
  const range = { gte: asDay(from), lte: asDay(to) };

  // 1. L'argent de la période, par moyen et par nature, puis jour par jour.
  const movements = await prisma.$queryRaw<{ day: Date; method: PaymentMethod; kind: MovementKind; amount: bigint }[]>`
    SELECT business_date AS day, method, kind, SUM(amount) AS amount
    FROM money_movements
    WHERE business_date BETWEEN ${from}::date AND ${to}::date
    GROUP BY business_date, method, kind`;
  const byMethod = emptyBy(METHODS);
  const byKind = emptyBy(KINDS);
  const perDay = new Map<string, Record<PaymentMethod, number>>();
  for (const row of movements) {
    const amount = Number(row.amount);
    byMethod[row.method] += amount;
    byKind[row.kind] += amount;
    const key = isoDay(row.day);
    const methods = perDay.get(key) ?? emptyBy(METHODS);
    methods[row.method] += amount;
    perDay.set(key, methods);
  }

  // 2. Les ventes de la période : une commande qui existe encore, à la date de son premier
  // paiement. Son bénéfice est inconnu (NULL) dès qu'une ligne n'a pas de prix d'achat.
  // `discount` (lot 3) : Σ (prix catalogue − prix accordé) × quantité, lignes sans prix catalogue ignorées.
  const sales = await prisma.$queryRaw<{ order_id: number; profit: bigint | null; discount: bigint }[]>`
    WITH sales AS (
      SELECT order_id, MIN(business_date) AS sale_date
      FROM money_movements
      WHERE kind IN ('sale', 'pickup', 'delivery') AND order_id IS NOT NULL
      GROUP BY order_id
    )
    SELECT s.order_id,
           CASE WHEN bool_or(i.unit_cost IS NULL) THEN NULL
                ELSE SUM((i.unit_price - i.unit_cost) * i.quantity) END AS profit,
           SUM(CASE WHEN i.list_price IS NULL THEN 0 ELSE (i.list_price - i.unit_price) * i.quantity END) AS discount
    FROM sales s
    JOIN orders o ON o.id = s.order_id
    JOIN order_items i ON i.order_id = o.id
    WHERE s.sale_date BETWEEN ${from}::date AND ${to}::date
    GROUP BY s.order_id`;

  // 3. Les caisses de la période.
  const cashDays = await prisma.cashDay.findMany({ where: { date: range } });
  const days = [...new Set([...perDay.keys(), ...cashDays.map((day) => isoDay(day.date))])]
    .sort()
    .reverse()
    .map((date) => {
      const methods = perDay.get(date) ?? emptyBy(METHODS);
      const cash = cashDays.find((day) => isoDay(day.date) === date);
      return {
        date,
        collected: METHODS.reduce((sum, method) => sum + methods[method], 0),
        byMethod: methods,
        cashDay: cash
          ? {
              openingFloat: cash.openingFloat,
              countedCash: cash.countedCash,
              gap: cash.countedCash === null ? null : cash.countedCash - (cash.openingFloat + methods.cash),
              closed: cash.closedAt !== null,
            }
          : null,
      };
    });

  // 4. Les commandes créées dans la période, ou encaissées dans la période (une seule fois chacune).
  const cashedIds = (
    await prisma.moneyMovement.findMany({
      where: { businessDate: range, orderId: { not: null } },
      select: { orderId: true },
      distinct: ["orderId"],
    })
  ).map((row) => row.orderId as number);
  const filters: Prisma.OrderWhereInput[] = [{ OR: [{ businessDate: range }, { id: { in: cashedIds } }] }];
  if (query.type) filters.push({ type: query.type });
  if (query.q) {
    const number = Number(query.q);
    filters.push({
      OR: [
        ...(Number.isInteger(number) ? [{ number }] : []),
        { phone: { contains: query.q.replace(/\s/g, "") } },
        { fullName: { contains: query.q, mode: "insensitive" as const } },
      ],
    });
  }
  const found = await prisma.order.findMany({
    where: { AND: filters },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: MAX_ORDERS + 1,
    include: { items: { select: { unitPrice: true, unitCost: true, listPrice: true, quantity: true } } },
  });
  const ordersTruncated = found.length > MAX_ORDERS;
  const rows = found.slice(0, MAX_ORDERS);
  const orderMovements = await prisma.moneyMovement.findMany({
    where: { orderId: { in: rows.map((order) => order.id) } },
    select: { orderId: true, amount: true, kind: true, businessDate: true },
  });
  const orders = rows.map((order) => {
    const own = orderMovements.filter((movement) => movement.orderId === order.id);
    const saleDates = own
      .filter((movement) => movement.kind === "sale" || movement.kind === "pickup" || movement.kind === "delivery")
      .map((movement) => isoDay(movement.businessDate))
      .sort();
    return {
      id: order.id,
      number: order.number,
      dailyNumber: order.dailyNumber,
      businessDate: isoDay(order.businessDate),
      type: order.type,
      status: order.status,
      fullName: order.fullName,
      phone: order.phone,
      total: order.total,
      paid: own.reduce((sum, movement) => sum + movement.amount, 0),
      cashedOn: [...new Set(saleDates)],
      saleDate: saleDates[0] ?? null,
      // Le bénéfice n'a de sens que pour une vente faite : une réservation n'en a pas encore.
      profit: saleDates.length > 0 ? orderProfit(order.items) : null,
      // La réduction accordée (lot 3) ; 0 sans prix catalogue connu (commande d'avant le lot 3).
      discount: priceReduction(order.items),
    };
  });

  // 5. Les modifications et suppressions de la période (jours d'Alger, UTC+1).
  const start = new Date(asDay(from).getTime() - HOUR);
  const end = new Date(asDay(to).getTime() + 24 * HOUR - HOUR);
  const events = await prisma.orderEvent.findMany({
    where: { createdAt: { gte: start, lt: end } },
    orderBy: { id: "desc" },
  });
  const users = await prisma.user.findMany({
    where: { id: { in: events.map((event) => event.userId).filter((id): id is number => id !== null) } },
    select: { id: true, firstName: true, lastName: true },
  });
  const changes = events.map((event) => {
    const user = users.find((candidate) => candidate.id === event.userId);
    return {
      id: event.id,
      createdAt: event.createdAt,
      kind: event.kind,
      orderNumber: event.orderNumber,
      orderId: event.orderId,
      summary: event.summary,
      userName: user ? `${user.firstName} ${user.lastName}` : null,
    };
  });

  const known = sales.filter((sale) => sale.profit !== null);
  return {
    from,
    to,
    totals: {
      collected: METHODS.reduce((sum, method) => sum + byMethod[method], 0),
      byMethod,
      byKind,
      salesCount: sales.length,
      profit: known.reduce((sum, sale) => sum + Number(sale.profit), 0),
      unknownCostSales: sales.length - known.length,
      // Les réductions accordées sur les ventes de la période (lot 3).
      discount: sales.reduce((sum, sale) => sum + Number(sale.discount), 0),
    },
    days,
    orders,
    ordersTruncated,
    changes,
  };
}
