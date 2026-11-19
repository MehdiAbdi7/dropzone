import type { HistoryRepair } from "@/features/admin/api/historyApi";
import { historyAmountText, repairNumber } from "@/features/admin/repairs/repairsView";
import { formatPrice } from "@/lib/format";

const dayLabel = (iso: string) => iso.split("-").reverse().join("/");

// Le bénéfice d'une réparation : ce que le client a payé moins ce que les pièces ont coûté. Négatif sous garantie
// (le magasin a payé les pièces sans rien encaisser) : le signe et le mot le disent, pas seulement la couleur.
const profitText = (profit: number) => `${profit < 0 ? "−" : ""}${formatPrice(Math.abs(profit))}`;

// Les réparations rendues de la période (onglet Réparations) : chaque fiche compte le jour de son Rendu.
export default function HistoryRepairs({ repairs }: { repairs: HistoryRepair[] }) {
  return (
    <section aria-labelledby="repairs-title" className="space-y-3">
      <h2 id="repairs-title" className="text-xl">
        Réparations rendues
      </h2>
      {repairs.length === 0 ? (
        <p className="text-ink-muted">Aucune réparation rendue sur cette période.</p>
      ) : (
        <ul className="card divide-y divide-line">
          {repairs.map((repair) => (
            <li key={repair.id} className="flex flex-wrap items-start justify-between gap-3 p-3 text-sm">
              <span className="min-w-0">
                <span className="font-display font-bold text-blue-ink">{repairNumber(repair.number)}</span>
                <span className="block truncate font-semibold">
                  {repair.deviceName} · {repair.fullName}
                </span>
                <span className="block text-xs text-ink-muted">
                  Rendu le {dayLabel(repair.returnedOn)}
                  {repair.replacement ? " · remplacement sous garantie" : repair.underWarranty ? " · sous garantie" : ""}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-bold tabular-nums">
                  {historyAmountText(repair.paidAmount, repair.payMethod)}
                </span>
                <span className="block text-ink-muted">pièces {formatPrice(repair.partsCost)}</span>
                <span className="block text-ink-muted">bénéfice {profitText(repair.profit)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
