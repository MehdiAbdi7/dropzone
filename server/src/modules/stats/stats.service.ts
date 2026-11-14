import { prisma } from "../../config/db.js";
import { algiersDate } from "../../utils/algiersTime.js";
import { getTodayCash } from "../cash/cash.service.js";

// Le tableau de bord, écrit en SQL : GROUP BY et SUM sont plus lisibles ici qu'en
// Prisma, et c'est ce SQL qu'on demande en entretien. Les valeurs passent toujours
// en paramètres (les ${…} d'un $queryRaw ne sont jamais collés dans le texte SQL).
// Les journées sont celles d'Alger (minuit à minuit, UTC+1) : `algiersDate(now)` donne le jour,
// passé au SQL en paramètre, et les commandes portent leur jour dans `business_date`.

// Depuis le 14/11, plus de « stock faible » : avec les affaires, beaucoup d'articles sont
// toujours à 0, la liste ne disait rien. L'accueil montre la journée du magasin.
export async function getStats(now: Date = new Date()) {
  // Les bornes viennent de la date d'Alger passée en paramètre (et non de now() de la base) :
  // le même calcul sert en production et dans les tests à horloge simulée.
  const today = algiersDate(now);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [revenue] = await prisma.$queryRaw<{ today: bigint; month: bigint; orders_today: bigint }[]>`
    SELECT
      COALESCE(SUM(s.total) FILTER (WHERE s.sale_date = ${today}::date), 0) AS today,
      COALESCE(SUM(s.total) FILTER (WHERE s.sale_date BETWEEN ${monthStart}::date AND ${today}::date), 0) AS month,
      COUNT(*) FILTER (WHERE s.sale_date = ${today}::date) AS orders_today
    FROM (
      -- La date d'une vente (lot 2, 15/11) : le jour du paiement au comptoir pour un retrait ou une
      -- vente au magasin ; le jour de la commande pour une livraison (son argent suit à part).
      SELECT o.total,
             COALESCE(
               (SELECT MIN(m.business_date) FROM money_movements m
                 WHERE m.order_id = o.id AND m.kind IN ('sale', 'pickup')),
               o.business_date) AS sale_date
      FROM orders o
      -- Une réservation n'est pas une vente tant que le client n'est pas venu payer (14/11).
      WHERE o.status NOT IN ('cancelled', 'reserved', 'expired')
    ) s
  `;

  const byStatus = await prisma.$queryRaw<{ status: string; count: bigint }[]>`
    SELECT status::text AS status, COUNT(*) AS count
    FROM orders
    GROUP BY status
  `;

  // Les retraits attendus aujourd'hui (heure d'Alger), dans l'ordre de leur heure.
  const todayDate = new Date(`${today}T00:00:00Z`);
  const pickupsToday = await prisma.order.findMany({
    where: { type: "pickup", status: "reserved", pickupDate: todayDate },
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
