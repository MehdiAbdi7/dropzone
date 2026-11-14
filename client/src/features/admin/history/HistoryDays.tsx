import type { History } from "@/features/admin/api/historyApi";
import { formatPrice } from "@/lib/format";
import type { OrderType } from "@/types/api";

const dayLabel = (iso: string) => {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

// Les caisses de la période, jour par jour. L'écart se lit en texte et en couleur : une couleur
// seule ne suffit pas (WCAG).
export default function HistoryDays({ days, tab }: { days: History["days"]; tab?: OrderType }) {
  if (days.length === 0) return null;
  // Sous « Livraisons » : l'argent arrivé jour par jour. Il n'entre jamais dans la caisse du magasin
  // (17/11, lot 4), donc ni fond, ni comptage, ni écart.
  if (tab === "delivery") {
    return (
      <section aria-labelledby="days-title" className="space-y-3">
        <h2 id="days-title" className="text-xl">
          Argent arrivé, jour par jour
        </h2>
        <p className="text-sm text-ink-muted">L&apos;argent d&apos;une livraison compte le jour où il est arrivé, hors caisse.</p>
        <div className="card overflow-x-auto">
          <table className="table min-w-[320px]">
            <thead>
              <tr>
                <th scope="col">Jour</th>
                <th scope="col">Encaissé</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.date}>
                  <th scope="row" className="font-semibold">
                    {dayLabel(day.date)}
                  </th>
                  <td className="tabular-nums">{formatPrice(day.collected)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }
  return (
    <section aria-labelledby="days-title" className="space-y-3">
      <h2 id="days-title" className="text-xl">
        Caisses
      </h2>
      <div className="card overflow-x-auto">
        <table className="table min-w-[560px]">
          <thead>
            <tr>
              <th scope="col">Jour</th>
              <th scope="col">Encaissé</th>
              <th scope="col">Fond</th>
              <th scope="col">Compté</th>
              <th scope="col">Écart</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.date}>
                <th scope="row" className="font-semibold">
                  {dayLabel(day.date)}
                </th>
                <td className="tabular-nums">{formatPrice(day.collected)}</td>
                <td className="tabular-nums">{day.cashDay ? formatPrice(day.cashDay.openingFloat) : "—"}</td>
                <td className="tabular-nums">
                  {day.cashDay ? (day.cashDay.closed && day.cashDay.countedCash !== null ? formatPrice(day.cashDay.countedCash) : "Pas fermée") : "—"}
                </td>
                <td className="tabular-nums">
                  {day.cashDay?.gap == null ? (
                    "—"
                  ) : day.cashDay.gap === 0 ? (
                    "Aucun"
                  ) : (
                    <span className={day.cashDay.gap < 0 ? "font-semibold text-red" : "font-semibold text-amber"}>
                      {day.cashDay.gap > 0 ? "+" : ""}
                      {formatPrice(day.cashDay.gap)} {day.cashDay.gap < 0 ? "(il manque)" : "(en trop)"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
