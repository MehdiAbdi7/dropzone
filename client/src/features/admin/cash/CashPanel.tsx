"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import Field from "@/components/ui/Field";
import { PAYMENT_METHOD_LABELS } from "@/config/catalog";
import {
  useCashTodayQuery,
  useCloseCashMutation,
  useOpenCashMutation,
  useReopenCashMutation,
  type CashMovement,
  type CashReopening,
  type CashSummary,
} from "@/features/admin/api/cashApi";
import EditDialog from "@/features/admin/products/EditDialog";
import { errorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/format";
import type { PaymentMethod } from "@/types/api";

// Le contenu de la fenêtre Caisse (23/11, avant : la page /admin/caisse). Elle s'ouvre de partout avec le bouton de la
// barre du haut (CashDialogContext) ; ses liens ferment la fenêtre pour que la page visée ne reste pas sous le fond noir.
// La journée de caisse (14/11). Le matin : saisir le fond. Pendant la journée : chaque
// paiement entre dans le journal (les espèces dans le tiroir). Le soir : compter le tiroir et
// saisir le montant ; l'app affiche ce qui est rentré, ce qui était attendu, et l'écart.
// Une caisse fermée par erreur (ou avant une vente tardive) se rouvre le jour même : l'argent déjà
// encaissé reste dans le jour, le comptage est effacé, et la trace garde l'ancien montant. Une
// caisse d'un jour passé ne se rouvre pas : une correction s'écrit le jour où elle est faite.

const KIND_LABELS: Record<CashMovement["kind"], string> = {
  sale: "Vente au magasin",
  pickup: "Réservation",
  delivery: "Livraison encaissée",
  exchange: "Échange",
  correction: "Correction",
  return_fee: "Frais de retour",
  repair: "Réparation",
};

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];
const toAmount = (value: string) => (value.trim() === "" ? Number.NaN : Number(value));
const time = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Algiers" }).format(new Date(iso));

type Panel = "open" | "close" | "reopen" | "summary" | "movements" | "reopenings";

export default function CashPanel({ onNavigate }: { onNavigate: () => void }) {
  const { data, isError } = useCashTodayQuery(undefined, { pollingInterval: 60_000 });
  // La fenêtre ouverte (refonte du 18/11) : la page garde l'essentiel, chaque formulaire et chaque liste
  // est derrière un bouton.
  const [open, setOpen] = useState<Panel | null>(null);
  const close = () => setOpen(null);

  if (isError) {
    return <p role="alert">La caisse ne répond pas.</p>;
  }
  if (!data) {
    return <p className="text-ink-muted">Chargement…</p>;
  }

  const [year, month, day] = data.date.split("-");
  const summary = data.summary;
  const isClosed = data.day?.closedAt != null;
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-muted">
          Journée du {day}/{month}/{year}
          {data.day && summary ? ` · ${isClosed ? "fermée" : "ouverte"}` : ""}
        </p>
        {/* Une vente saisie au comptoir (lot 3) ; elle exige la journée de caisse ouverte. */}
        <Link href="/admin/vente" className="btn btn-primary" onClick={onNavigate}>
          Nouvelle vente
        </Link>
      </header>

      {!data.day || !summary ? (
        <div className="card space-y-3 p-5">
          <p className="text-ink-muted">Aucune journée ouverte. Sans journée ouverte, on ne peut pas encaisser.</p>
          <button type="button" className="btn btn-primary" onClick={() => setOpen("open")}>
            Ouvrir la journée
          </button>
        </div>
      ) : (
        <>
          <section aria-label="Chiffres de la journée" className="grid grid-cols-3 gap-3">
            <Kpi label="Attendu au tiroir" value={formatPrice(summary.expectedCash)} warn={summary.expectedCash < 0} />
            <Kpi label="Encaissé" value={formatPrice(summary.total)} />
            <Kpi
              label={isClosed ? "Écart" : "Fond de caisse"}
              value={isClosed && summary.gap !== null ? (summary.gap === 0 ? "Aucun" : formatPrice(summary.gap)) : formatPrice(summary.openingFloat)}
              warn={isClosed && summary.gap !== null && summary.gap < 0}
            />
          </section>
          {/* L'argent des livraisons n'entre jamais dans le tiroir (17/11, lot 4) : une ligne à part. */}
          {data.deliveriesCollected !== 0 ? (
            <p className="text-sm text-ink-muted">
              Livraisons encaissées aujourd&apos;hui : <strong>{formatPrice(data.deliveriesCollected)}</strong>, hors caisse (voir{" "}
              <Link href="/admin/livraisons" className="underline" onClick={onNavigate}>
                Livraisons
              </Link>
              ).
            </p>
          ) : null}
          <div role="group" aria-label="Actions de la caisse" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <PanelButton onClick={() => setOpen(isClosed ? "reopen" : "close")} primary={!isClosed}>
              {isClosed ? "Rouvrir la journée" : "Fermer la journée"}
            </PanelButton>
            <PanelButton onClick={() => setOpen("summary")}>Détail de la journée</PanelButton>
            <PanelButton onClick={() => setOpen("movements")} count={data.movements.length}>
              Mouvements
            </PanelButton>
            {data.reopenings.length > 0 ? (
              <PanelButton onClick={() => setOpen("reopenings")} count={data.reopenings.length}>
                Réouvertures
              </PanelButton>
            ) : null}
          </div>
        </>
      )}

      <EditDialog open={open === "open"} title="Ouvrir la journée" size="sm" onClose={close} closeLabel="Annuler">
        <OpenCash onDone={close} />
      </EditDialog>
      {summary ? (
        <>
          <EditDialog open={open === "close"} title="Fermer la journée" size="sm" onClose={close} closeLabel="Annuler">
            <CloseCash expected={summary.expectedCash} onDone={close} />
          </EditDialog>
          <EditDialog open={open === "reopen"} title="Rouvrir la journée" size="sm" onClose={close} closeLabel="Annuler">
            <ReopenCash onDone={close} />
          </EditDialog>
          <EditDialog open={open === "summary"} title="Détail de la journée" onClose={close}>
            <Summary summary={summary} closed={isClosed} />
          </EditDialog>
          <EditDialog open={open === "movements"} title="Mouvements du jour" onClose={close}>
            <Movements movements={data.movements} onNavigate={onNavigate} />
          </EditDialog>
          <EditDialog open={open === "reopenings"} title="Réouvertures du jour" onClose={close}>
            <Reopenings reopenings={data.reopenings} />
          </EditDialog>
        </>
      ) : null}
    </div>
  );
}

function Kpi({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="card p-3 sm:p-5">
      <h2 className="text-xs font-semibold text-ink-muted sm:text-sm">{label}</h2>
      <p className={`font-display text-lg font-bold tabular-nums sm:text-3xl ${warn ? "text-red" : ""}`}>{value}</p>
    </div>
  );
}

function PanelButton({
  onClick,
  count,
  primary = false,
  children,
}: {
  onClick: () => void;
  count?: number;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${primary ? "btn btn-primary" : "card"} flex items-center justify-between gap-2 p-4 text-left font-display font-bold transition-[border-color] hover:border-blue-ink`}
    >
      <span>{children}</span>
      {count !== undefined ? <span className="rounded-full bg-blue-soft px-2.5 py-0.5 text-sm tabular-nums">{count}</span> : null}
    </button>
  );
}

function OpenCash({ onDone }: { onDone: () => void }) {
  const [value, setValue] = useState("");
  const [openCash, { isLoading, error }] = useOpenCashMutation();
  const amount = toAmount(value);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (Number.isInteger(amount) && amount >= 0) openCash({ openingFloat: amount }).unwrap().then(onDone, () => {});
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-ink-muted">
        Comptez l&apos;argent déposé dans le tiroir avant la première vente. Sans journée ouverte, on ne peut pas encaisser une
        réservation.
      </p>
      <Field id="openingFloat" label="Fond de caisse (DA)" error={error ? errorMessage(error) : undefined}>
        <input
          id="openingFloat"
          className="input"
          inputMode="numeric"
          value={value}
          onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))}
        />
      </Field>
      <button type="submit" className="btn btn-primary" disabled={isLoading || !Number.isInteger(amount)}>
        Ouvrir la journée
      </button>
    </form>
  );
}

function Summary({ summary, closed }: { summary: CashSummary; closed: boolean }) {
  const rows: [string, string][] = [
    ["Fond de caisse", formatPrice(summary.openingFloat)],
    ["Espèces de la journée", formatPrice(summary.cashIn)],
    ["Attendu dans le tiroir", formatPrice(summary.expectedCash)],
  ];
  return (
    <section aria-labelledby="summary-title" className="grid gap-6 md:grid-cols-2">
      <div className="card space-y-3 p-5">
        <h2 id="summary-title" className="text-lg">
          {closed ? "Journée fermée" : "Journée ouverte"}
        </h2>
        <dl className="space-y-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-ink-muted">{label}</dt>
              <dd className="font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
          {summary.countedCash !== null && summary.entered !== null && summary.gap !== null ? (
            <>
              <div className="flex justify-between gap-3 border-t border-line pt-2">
                <dt className="text-ink-muted">Compté à la fermeture</dt>
                <dd className="font-semibold tabular-nums">{formatPrice(summary.countedCash)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="font-semibold">Rentré aujourd&apos;hui (compté − fond)</dt>
                <dd className="font-display text-lg font-bold tabular-nums">{formatPrice(summary.entered)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="font-semibold">Écart</dt>
                <dd
                  className={`font-display text-lg font-bold tabular-nums ${
                    summary.gap < 0 ? "text-red" : summary.gap > 0 ? "text-amber" : ""
                  }`}
                >
                  {summary.gap === 0
                    ? "Aucun"
                    : `${summary.gap > 0 ? "+" : ""}${formatPrice(summary.gap)}${summary.gap < 0 ? " (il manque de l'argent)" : " (en trop)"}`}
                </dd>
              </div>
            </>
          ) : null}
        </dl>
        {summary.expectedCash < 0 ? (
          <p role="alert" className="text-sm font-semibold text-red">
            Attention : plus d&apos;espèces sont sorties du tiroir qu&apos;il n&apos;en contenait.
          </p>
        ) : null}
      </div>
      <div className="card space-y-3 p-5">
        <h2 className="text-lg">Encaissé aujourd&apos;hui</h2>
        <dl className="space-y-2 text-sm">
          {METHODS.map((method) => (
            <div key={method} className="flex justify-between gap-3">
              <dt className="text-ink-muted">{PAYMENT_METHOD_LABELS[method]}</dt>
              <dd className="tabular-nums">{formatPrice(summary.byMethod[method])}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t border-line pt-2">
            <dt className="font-semibold">Total</dt>
            <dd className="font-display text-lg font-bold tabular-nums">{formatPrice(summary.total)}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function CloseCash({ expected, onDone }: { expected: number; onDone: () => void }) {
  const [value, setValue] = useState("");
  const [closeCash, { isLoading, error }] = useCloseCashMutation();
  const amount = toAmount(value);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (Number.isInteger(amount) && amount >= 0) closeCash({ countedCash: amount }).unwrap().then(onDone, () => {});
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-ink-muted">
        Comptez tout l&apos;argent du tiroir. Attendu : <strong>{formatPrice(expected)}</strong>. Une fois fermée, le comptage ne
        change plus (sauf en rouvrant la journée, ce qui est noté).
      </p>
      <Field id="countedCash" label="Montant compté (DA)" error={error ? errorMessage(error) : undefined}>
        <input
          id="countedCash"
          className="input"
          inputMode="numeric"
          value={value}
          onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))}
        />
      </Field>
      <button type="submit" className="btn btn-primary" disabled={isLoading || !Number.isInteger(amount)}>
        Fermer la journée
      </button>
    </form>
  );
}

function ReopenCash({ onDone }: { onDone: () => void }) {
  const [reopenCash, { isLoading, error }] = useReopenCashMutation();
  const [confirming, setConfirming] = useState(false);
  return (
    <section className="space-y-3">
      <p className="text-sm text-ink-muted">
        Pour corriger une erreur ou encaisser une vente après la fermeture. L&apos;argent déjà encaissé reste dans cette journée, le
        montant compté est effacé (il faudra recompter) et la réouverture est notée.
      </p>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-red">
          {errorMessage(error)}
        </p>
      ) : null}
      {confirming ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" disabled={isLoading} onClick={() => reopenCash().unwrap().then(onDone, () => {})}>
            Oui, rouvrir
          </button>
          <button type="button" className="btn" disabled={isLoading} onClick={() => setConfirming(false)}>
            Annuler
          </button>
        </div>
      ) : (
        <button type="button" className="btn" onClick={() => setConfirming(true)}>
          Rouvrir la journée
        </button>
      )}
    </section>
  );
}

function Reopenings({ reopenings }: { reopenings: CashReopening[] }) {
  if (reopenings.length === 0) return null;
  return (
    <section className="card p-5">
      <ul className="divide-y divide-line text-sm">
        {reopenings.map((reopening) => (
          <li key={reopening.id} className="py-2">
            <span className="tabular-nums text-ink-muted">{time(reopening.createdAt)}</span> Journée rouverte
            {reopening.previousCountedCash !== null ? (
              <span className="text-ink-muted"> · comptage effacé : {formatPrice(reopening.previousCountedCash)}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Movements({ movements, onNavigate }: { movements: CashMovement[]; onNavigate: () => void }) {
  return (
    <section className="card p-5">
      {movements.length === 0 ? (
        <p className="text-sm text-ink-muted">Aucun paiement pour l&apos;instant.</p>
      ) : (
        <ul className="divide-y divide-line text-sm">
          {movements.map((movement) => (
            <li key={movement.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <span>
                <span className="tabular-nums text-ink-muted">{time(movement.createdAt)}</span> {KIND_LABELS[movement.kind]}
                {movement.orderId ? (
                  <>
                    {" · "}
                    <Link href={`/admin/commandes/${movement.orderId}`} className="text-blue-ink underline" onClick={onNavigate}>
                      voir la commande
                    </Link>
                  </>
                ) : null}
                <span className="text-ink-muted"> · {PAYMENT_METHOD_LABELS[movement.method]}</span>
              </span>
              <span className={`font-semibold tabular-nums ${movement.amount < 0 ? "text-red" : ""}`}>
                {movement.amount > 0 ? "+" : ""}
                {formatPrice(movement.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
