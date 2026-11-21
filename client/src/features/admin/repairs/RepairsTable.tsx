import type { RepairRow } from "@/features/admin/api/repairsApi";
import { formatPrice } from "@/lib/format";
import { repairNumber, repairStepBadge, type RepairStatus } from "./repairsView";

// Ce qui attend une réponse du magasin ressort en rouge, ce qui est fini en bleu, le reste en gris.
const NEEDS_ACTION: RepairStatus[] = ["received", "quote", "ready"];

// Le badge d'une fiche : sa place dans le circuit (« 3/5 · En réparation »), comme sur les commandes.
export function RepairBadge({ status, underWarranty }: { status: RepairStatus; underWarranty: boolean }) {
  const tone = NEEDS_ACTION.includes(status) ? "bg-red-soft text-red" : status === "returned" ? "bg-blue-soft text-blue-ink" : "bg-surface-2 text-ink-muted";
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>{repairStepBadge(status, underWarranty)}</span>;
}

// Le prix d'une fiche dans la liste : « Sous garantie » ou le devis quand il existe (rien tant qu'il n'est pas fixé).
const priceText = (repair: RepairRow) => (repair.underWarranty ? "Sous garantie" : repair.total > 0 ? formatPrice(repair.total) : "Devis à fixer");

// La liste des fiches : une carte par fiche sur téléphone, un tableau dès 768 px. Un clic ouvre la fenêtre de la fiche.
export default function RepairsTable({
  repairs,
  busy,
  empty,
  showMoney = true,
  onOpen,
}: {
  repairs: RepairRow[] | undefined;
  busy: boolean;
  empty: string;
  // Faux pour le technicien : l'argent du client n'est pas dans ses réponses.
  showMoney?: boolean;
  onOpen: (id: number) => void;
}) {
  return (
    <>
      <ul className="space-y-2 md:hidden" aria-busy={busy}>
        {repairs?.map((repair) => (
          <li key={repair.id}>
            <button type="button" onClick={() => onOpen(repair.id)} className="card flex w-full items-center gap-3 p-3 text-left">
              <span className="min-w-0 flex-1 space-y-0.5">
                <RepairBadge status={repair.status} underWarranty={repair.underWarranty} />
                <span className="block font-display font-bold text-blue-ink">{repairNumber(repair.number)}</span>
                <span className="block truncate text-sm font-semibold">{repair.deviceName}</span>
                <span className="block truncate text-xs text-ink-muted">{repair.fullName}</span>
              </span>
              {showMoney ? <span className="shrink-0 text-sm font-bold tabular-nums">{priceText(repair)}</span> : null}
            </button>
          </li>
        ))}
        {repairs && repairs.length === 0 ? <li className="card p-6 text-ink-muted">{empty}</li> : null}
      </ul>

      <div className="card hidden overflow-x-auto md:block" aria-busy={busy}>
        <table className="table min-w-[720px]">
          <thead>
            <tr>
              <th scope="col">Numéro</th>
              <th scope="col">État</th>
              <th scope="col">Appareil</th>
              <th scope="col">Client</th>
              <th scope="col">Téléphone</th>
              {showMoney ? (
                <th scope="col" className="text-right">
                  Prix
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {repairs?.map((repair) => (
              <tr key={repair.id} className="cursor-pointer hover:bg-surface-2" onClick={() => onOpen(repair.id)}>
                <td>
                  <button type="button" className="font-display font-bold text-blue-ink" onClick={() => onOpen(repair.id)}>
                    {repairNumber(repair.number)}
                  </button>
                </td>
                <td>
                  <RepairBadge status={repair.status} underWarranty={repair.underWarranty} />
                </td>
                <td>{repair.deviceName}</td>
                <td>{repair.fullName}</td>
                <td className="tabular-nums">{repair.phone}</td>
                {showMoney ? <td className="text-right font-bold tabular-nums">{priceText(repair)}</td> : null}
              </tr>
            ))}
            {repairs && repairs.length === 0 ? (
              <tr>
                <td colSpan={showMoney ? 6 : 5} className="p-6 text-ink-muted">
                  {empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
