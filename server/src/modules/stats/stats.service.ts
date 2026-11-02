import { prisma } from "../../config/db.js";

// Le tableau de bord, écrit en SQL : GROUP BY et SUM sont plus lisibles ici qu'en
// Prisma, et c'est ce SQL qu'on demande en entretien. Les valeurs passent toujours
// en paramètres (les ${…} d'un $queryRaw ne sont jamais collés dans le texte SQL).
// Les journées commencent à minuit heure d'Alger, pas à minuit UTC. Prisma range les
// dates en UTC dans des colonnes sans fuseau : le CTE `bounds` calcule minuit à Alger,
// puis le convertit en heure UTC pour le comparer à created_at.

const LOW_STOCK = 2;

export async function getStats() {
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
    WHERE o.status <> 'cancelled'
  `;

  const byStatus = await prisma.$queryRaw<{ status: string; count: bigint }[]>`
    SELECT status::text AS status, COUNT(*) AS count
    FROM orders
    GROUP BY status
  `;

  const lowStock = await prisma.$queryRaw<{ id: number; name: string; sku: string; stock: number }[]>`
    SELECT p.id, p.name, v.sku, v.stock
    FROM product_variants v
    JOIN products p ON p.id = v.product_id
    WHERE v.condition = 'new' AND p.status = 'published' AND v.stock <= ${LOW_STOCK}
    ORDER BY v.stock ASC, p.name ASC
    LIMIT 10
  `;

  const [refurbished] = await prisma.$queryRaw<{ available: bigint; sold: bigint }[]>`
    SELECT
      COUNT(*) FILTER (WHERE stock > 0) AS available,
      COUNT(*) FILTER (WHERE stock = 0) AS sold
    FROM product_variants
    WHERE condition = 'refurbished'
  `;

  // PostgreSQL renvoie COUNT et SUM en bigint, que JSON ne sait pas écrire : Number().
  return {
    revenueToday: Number(revenue?.today ?? 0),
    revenueMonth: Number(revenue?.month ?? 0),
    ordersToday: Number(revenue?.orders_today ?? 0),
    ordersByStatus: Object.fromEntries(byStatus.map((row) => [row.status, Number(row.count)])),
    lowStock,
    refurbishedAvailable: Number(refurbished?.available ?? 0),
    refurbishedSold: Number(refurbished?.sold ?? 0),
  };
}
