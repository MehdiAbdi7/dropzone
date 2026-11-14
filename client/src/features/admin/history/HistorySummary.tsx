import { PAYMENT_METHOD_LABELS } from "@/config/catalog";
import type { History } from "@/features/admin/api/historyApi";
import { formatPrice } from "@/lib/format";
import type { PaymentMethod } from "@/types/api";

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

// Les chiffres de la période : l'argent encaissé (par moyen de paiement), les ventes et le bénéfice.
// L'argent compte à la date de chaque encaissement ; une vente à la date de son premier paiement.
export default function HistorySummary({ totals }: { totals: History["totals"] }) {
  return (
    <section aria-label="Chiffres de la période" className="grid gap-4 md:grid-cols-3">
      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-semibold text-ink-muted">Encaissé</h2>
        <p className="font-display text-3xl font-bold tabular-nums">{formatPrice(totals.collected)}</p>
        <dl className="space-y-1 text-sm">
          {METHODS.filter((method) => totals.byMethod[method] !== 0).map((method) => (
            <div key={method} className="flex justify-between gap-3">
              <dt className="text-ink-muted">{PAYMENT_METHOD_LABELS[method]}</dt>
              <dd className="font-semibold tabular-nums">{formatPrice(totals.byMethod[method])}</dd>
            </div>
          ))}
          {totals.byKind.correction !== 0 ? (
            <div className="flex justify-between gap-3 border-t border-line pt-1">
              <dt className="text-ink-muted">dont corrections</dt>
              <dd className="font-semibold tabular-nums">{formatPrice(totals.byKind.correction)}</dd>
            </div>
          ) : null}
        </dl>
        {totals.collected === 0 && totals.byKind.correction === 0 ? (
          <p className="text-sm text-ink-muted">Rien n&apos;a été encaissé sur cette période.</p>
        ) : null}
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-semibold text-ink-muted">Ventes</h2>
        <p className="font-display text-3xl font-bold tabular-nums">{totals.salesCount}</p>
        <p className="text-sm text-ink-muted">Une vente compte le jour de son premier paiement.</p>
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-semibold text-ink-muted">Bénéfice</h2>
        <p className="font-display text-3xl font-bold tabular-nums">{formatPrice(totals.profit)}</p>
        <p className="text-sm text-ink-muted">
          {totals.unknownCostSales > 0
            ? `${totals.unknownCostSales} vente${totals.unknownCostSales > 1 ? "s" : ""} sans prix d'achat, non comptée${
                totals.unknownCostSales > 1 ? "s" : ""
              }.`
            : "Cadeaux compris, frais de livraison exclus."}
        </p>
      </div>
    </section>
  );
}
