import { prisma } from "../../config/db.js";
import { addDays, algiersDate } from "../../utils/algiersTime.js";
import { validSales } from "./validSales.js";

// L'aperçu du tableau de bord (20/11) : de quoi dessiner les graphiques. Écrit en SQL comme getStats : GROUP BY et SUM
// sont plus lisibles ici. Les jours sont ceux d'Alger : `algiersDate(now)` donne aujourd'hui, passé en paramètre.
export type OverviewDays = 7 | 30;
export const CHANNELS = ["in_store", "delivery", "pickup", "exchange"] as const;
const RECENT_LIMIT = 8;

type Totals = { sales: number; orders: number; profit: number; collected: number };

export async function getOverview(days: OverviewDays, now: Date = new Date()) {
  const today = algiersDate(now);
  const from = addDays(today, -(days - 1));

  const [salesRows, profitRows, collectedRows, channelRows, recentRows] = await Promise.all([
    // Ventes et nombre de commandes, par jour de vente.
    prisma.$queryRaw<{ day: string; sales: bigint; orders: bigint }[]>`
      SELECT s.sale_date::text AS day, SUM(s.total) AS sales, COUNT(*) AS orders
      FROM (${validSales}) s
      WHERE s.sale_date BETWEEN ${from}::date AND ${today}::date
      GROUP BY s.sale_date`,
    // Le bénéfice d'une commande : (prix accordé − prix d'achat copié à la vente) × quantité, cadeaux compris (leur
    // coût est réel). Une commande dont UN prix d'achat manque n'a pas de bénéfice connu : on ne l'invente pas, elle
    // est comptée à part (`unknown`), comme orderProfit.
    prisma.$queryRaw<{ day: string; profit: bigint; unknown: bigint }[]>`
      SELECT p.day,
             COALESCE(SUM(p.profit) FILTER (WHERE NOT p.unknown), 0) AS profit,
             COUNT(*) FILTER (WHERE p.unknown) AS unknown
      FROM (
        SELECT s.id, s.sale_date::text AS day,
               SUM((i.unit_price - COALESCE(i.unit_cost, 0)) * i.quantity) AS profit,
               BOOL_OR(i.unit_cost IS NULL) AS unknown
        FROM (${validSales}) s
        JOIN order_items i ON i.order_id = s.id
        WHERE s.sale_date BETWEEN ${from}::date AND ${today}::date
        GROUP BY s.id, s.sale_date
      ) p
      GROUP BY p.day`,
    // L'argent réel du journal, tous mouvements : ventes, corrections, frais de retour, réparations.
    prisma.$queryRaw<{ day: string; collected: bigint }[]>`
      SELECT business_date::text AS day, SUM(amount) AS collected
      FROM money_movements
      WHERE business_date BETWEEN ${from}::date AND ${today}::date
      GROUP BY business_date`,
    // La répartition par canal de la période.
    prisma.$queryRaw<{ type: string; total: bigint; count: bigint }[]>`
      SELECT s.type, SUM(s.total) AS total, COUNT(*) AS count
      FROM (${validSales}) s
      WHERE s.sale_date BETWEEN ${from}::date AND ${today}::date
      GROUP BY s.type`,
    // Les derniers produits vendus, quelle que soit la période : les plus récents d'abord, sans les cadeaux.
    prisma.$queryRaw<
      { order_id: number; daily_number: number; type: string; sold_on: string; name: string; options: unknown; quantity: number; unit_price: number; image: string | null }[]
    >`
      SELECT s.id AS order_id, o.daily_number, s.type, s.sale_date::text AS sold_on,
             i.name, i.options, i.quantity, i.unit_price,
             (SELECT pi.url FROM product_images pi WHERE pi.product_id = i.product_id ORDER BY pi.position LIMIT 1) AS image
      FROM (${validSales}) s
      JOIN orders o ON o.id = s.id
      JOIN order_items i ON i.order_id = s.id
      WHERE NOT i.is_gift
      ORDER BY s.sale_date DESC, i.id DESC
      LIMIT ${RECENT_LIMIT}`,
  ]);

  // Un point par jour, même sans vente : un graphique n'a pas de trou. PostgreSQL rend SUM et COUNT en bigint, que
  // JSON ne sait pas écrire : Number().
  const byDay = new Map<string, Totals>();
  for (let offset = 0; offset < days; offset += 1) {
    byDay.set(addDays(from, offset), { sales: 0, orders: 0, profit: 0, collected: 0 });
  }
  for (const row of salesRows) Object.assign(byDay.get(row.day) ?? {}, { sales: Number(row.sales), orders: Number(row.orders) });
  for (const row of profitRows) Object.assign(byDay.get(row.day) ?? {}, { profit: Number(row.profit) });
  for (const row of collectedRows) Object.assign(byDay.get(row.day) ?? {}, { collected: Number(row.collected) });

  return {
    series: [...byDay].map(([date, totals]) => ({ date, ...totals })),
    // Toujours les quatre canaux, dans le même ordre : l'anneau ne change pas de couleurs d'un jour à l'autre.
    channels: CHANNELS.map((type) => {
      const row = channelRows.find((candidate) => candidate.type === type);
      return { type, total: Number(row?.total ?? 0), count: Number(row?.count ?? 0) };
    }),
    // Les ventes de la période dont le bénéfice n'est pas connu (un prix d'achat manque).
    profitUnknown: profitRows.reduce((sum, row) => sum + Number(row.unknown), 0),
    recent: recentRows.map((row) => ({
      orderId: row.order_id,
      dailyNumber: row.daily_number,
      type: row.type,
      soldOn: row.sold_on,
      name: row.name,
      options: row.options,
      quantity: row.quantity,
      unitPrice: row.unit_price,
      image: row.image,
    })),
  };
}
