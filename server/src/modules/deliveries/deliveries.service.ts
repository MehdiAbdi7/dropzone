import { prisma } from "../../config/db.js";
import { algiersDate } from "../../utils/algiersTime.js";

// Le résumé de la page Livraisons (17/11, lot 4). Les livraisons se suivent à part de la caisse :
//  - en cours : confirmées ou en route, ce qu'elles vont rapporter ;
//  - à encaisser : livrées mais l'argent n'est pas encore arrivé ;
//  - encaissé par jour : l'argent arrivé, à la date de l'encaissement (corrections comprises, donc
//    une livraison supprimée après coup se retranche le jour où elle l'est) ;
//  - retournées : colis refusés.
// Le SQL est écrit à la main (GROUP BY, FILTER) : c'est lui qu'on explique en entretien.
const DAYS = 30;

export async function getDeliverySummary(now: Date = new Date()) {
  const [orders] = await prisma.$queryRaw<
    {
      in_progress_count: bigint;
      in_progress_total: bigint;
      to_collect_count: bigint;
      to_collect_total: bigint;
      returned_count: bigint;
    }[]
  >`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('pending', 'confirmed', 'shipped')) AS in_progress_count,
      COALESCE(SUM(total) FILTER (WHERE status IN ('pending', 'confirmed', 'shipped')), 0) AS in_progress_total,
      COUNT(*) FILTER (WHERE status = 'delivered') AS to_collect_count,
      COALESCE(SUM(total) FILTER (WHERE status = 'delivered'), 0) AS to_collect_total,
      COUNT(*) FILTER (WHERE status = 'returned') AS returned_count
    FROM orders
    WHERE type = 'delivery'`;

  const today = algiersDate(now);
  const collected = await prisma.$queryRaw<{ day: Date; total: bigint }[]>`
    SELECT business_date AS day, SUM(amount) AS total
    FROM money_movements
    WHERE order_type = 'delivery'
      AND business_date BETWEEN (${today}::date - ${DAYS - 1}::int) AND ${today}::date
    GROUP BY business_date
    ORDER BY business_date DESC`;
  const [allTime] = await prisma.$queryRaw<{ total: bigint }[]>`
    SELECT COALESCE(SUM(amount), 0) AS total FROM money_movements WHERE order_type = 'delivery'`;

  return {
    inProgress: { count: Number(orders?.in_progress_count ?? 0), total: Number(orders?.in_progress_total ?? 0) },
    toCollect: { count: Number(orders?.to_collect_count ?? 0), total: Number(orders?.to_collect_total ?? 0) },
    returned: { count: Number(orders?.returned_count ?? 0) },
    collectedByDay: collected.map((row) => ({ date: row.day.toISOString().slice(0, 10), total: Number(row.total) })),
    // Tout ce que les livraisons ont rapporté depuis le début (pas seulement les 30 derniers jours).
    collectedTotal: Number(allTime?.total ?? 0),
  };
}
