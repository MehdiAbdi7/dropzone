import { prisma } from "../../config/db.js";
import { algiersDate } from "../../utils/algiersTime.js";
import { getTodayCash } from "../cash/cash.service.js";

// Le tableau de bord, écrit en SQL : GROUP BY et SUM sont plus lisibles ici qu'en
// Prisma, et c'est ce SQL qu'on demande en entretien. Les valeurs passent toujours
// en paramètres (les ${…} d'un $queryRaw ne sont jamais collés dans le texte SQL).
// Les journées commencent à minuit heure d'Alger, pas à minuit UTC. Prisma range les
// dates en UTC dans des colonnes sans fuseau : le CTE `bounds` calcule minuit à Alger,
// puis le convertit en heure UTC pour le comparer à created_at.

// Depuis le 14/11, plus de « stock faible » : avec les affaires, beaucoup d'articles sont
// toujours à 0, la liste ne disait rien. L'accueil montre la journée du magasin.
export async function getStats(now: Date = new Date()) {
  const [revenue] = await prisma.$queryRaw<{ today: bigint; month: bigint; orders_today: bigint }[]>`
    WITH bounds AS (
      SELECT
        (date_trunc('day', now() AT TIME ZONE 'Africa/Algiers') AT TIME ZONE 'Africa/Algiers') AT TIME ZONE 'UTC' AS day_start,
        (date_trunc('month', now() AT TIME ZONE 'Africa/Algiers') AT TIME ZONE 'Africa/Algiers') AT TIME ZONE 'UTC' AS month_start
    )
    SELECT
      COALESCE(SUM(o.total) FILTER (WHERE o.created_at >= b.day_start), 0) AS today,
      COALESCE(SUM(o.total) FILTER (WHERE o.created_at >= b.month_start), 0) AS month,
      COUNT(*) FILTER (WHERE o.created_at >= b.day_start) AS orders_today
    FROM orders o
    CROSS JOIN bounds b
    -- Une réservation n'est pas une vente tant que le client n'est pas venu payer (14/11).
    WHERE o.status NOT IN ('cancelled', 'reserved', 'expired')
  `;

  const byStatus = await prisma.$queryRaw<{ status: string; count: bigint }[]>`
    SELECT status::text AS status, COUNT(*) AS count
    FROM orders
    GROUP BY status
  `;

  // Les retraits attendus aujourd'hui (heure d'Alger), dans l'ordre de leur heure.
  const today = new Date(`${algiersDate(now)}T00:00:00Z`);
  const pickupsToday = await prisma.order.findMany({
    where: { type: "pickup", status: "reserved", pickupDate: today },
    orderBy: [{ pickupTime: "asc" }, { id: "asc" }],
    select: { id: true, dailyNumber: true, fullName: true, phone: true, pickupTime: true, total: true },
  });

  // La journée de caisse : ouverte, fermée, et ce qui est encaissé aujourd'hui (tous moyens).
  const { day, summary } = await getTodayCash(now);

  const [refurbished] = await prisma.$queryRaw<{ available: bigint; sold: bigint }[]>`
    SELECT
      (SELECT COALESCE(SUM(stock), 0) FROM product_variants WHERE condition = 'refurbished') AS available,
      -- Les appareils commandés, pas les fiches à 0 : une fiche peut avoir plusieurs exemplaires
      -- (10/11), et une fiche créée sans stock n'a rien vendu. Les cadeaux et les annulations
      -- ne comptent pas.
      (SELECT COALESCE(SUM(i.quantity), 0)
         FROM order_items i
         JOIN orders o ON o.id = i.order_id
        WHERE i.condition = 'refurbished' AND NOT i.is_gift AND o.status <> 'cancelled') AS sold
  `;

  // PostgreSQL renvoie COUNT et SUM en bigint, que JSON ne sait pas écrire : Number().
  return {
    revenueToday: Number(revenue?.today ?? 0),
    revenueMonth: Number(revenue?.month ?? 0),
    ordersToday: Number(revenue?.orders_today ?? 0),
    ordersByStatus: Object.fromEntries(byStatus.map((row) => [row.status, Number(row.count)])),
    pickupsToday,
    cash: {
      open: day !== null,
      closed: day?.closedAt != null,
      expectedCash: summary?.expectedCash ?? null,
      cashedToday: summary?.total ?? 0,
    },
    refurbishedAvailable: Number(refurbished?.available ?? 0),
    refurbishedSold: Number(refurbished?.sold ?? 0),
  };
}
