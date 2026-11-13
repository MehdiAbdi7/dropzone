"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import Field from "@/components/ui/Field";
import { PAYMENT_METHOD_LABELS } from "@/config/catalog";
import {
  useCashTodayQuery,
  useCloseCashMutation,
  useOpenCashMutation,
  type CashMovement,
  type CashSummary,
} from "@/features/admin/api/cashApi";
import { errorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/format";
import type { PaymentMethod } from "@/types/api";

// La journée de caisse (14/11). Le matin : saisir le fond. Pendant la journée : chaque
// paiement entre dans le journal (les espèces dans le tiroir). Le soir : compter le tiroir et
// saisir le montant ; l'app affiche ce qui est rentré, ce qui était attendu, et l'écart.
// Une caisse fermée ne se rouvre pas : une correction s'écrira le jour où elle est faite.

const KIND_LABELS: Record<CashMovement["kind"], string> = {
  sale: "Vente au magasin",
  pickup: "Retrait",
  delivery: "Livraison encaissée",
  exchange: "Échange",
  correction: "Correction",
};

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];
const toAmount = (value: string) => (value.trim() === "" ? Number.NaN : Number(value));
const time = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Algiers" }).format(new Date(iso));

export default function CashPage() {
  const { data, isError } = useCashTodayQuery(undefined, { pollingInterval: 60_000 });

  if (isError) {
    return <p role="alert">La caisse ne répond pas.</p>;
  }
  if (!data) {
    return <p className="text-ink-muted">Chargement…</p>;
  }

  const [year, month, day] = data.date.split("-");
  return (
    <div className="max-w-4xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl">Caisse</h1>
        <p className="text-ink-muted">
          Journée du {day}/{month}/{year}
        </p>
      </header>

      {!data.day || !data.summary ? (
        <OpenCash />
      ) : (
        <>
          <Summary summary={data.summary} closed={data.day.closedAt !== null} />
          {data.day.closedAt === null ? <CloseCash expected={data.summary.expectedCash} /> : null}
          <Movements movements={data.movements} />
        </>
      )}
    </div>
  );
}

function OpenCash() {
  const [value, setValue] = useState("");
  const [openCash, { isLoading, error }] = useOpenCashMutation();
  const amount = toAmount(value);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (Number.isInteger(amount) && amount >= 0) openCash({ openingFloat: amount });
  };
  return (
    <form onSubmit={submit} className="card max-w-md space-y-4 p-5">
      <h2 className="text-lg">Ouvrir la journée</h2>
      <p className="text-sm text-ink-muted">
        Comptez l&apos;argent déposé dans le tiroir avant la première vente. Sans journée ouverte, on ne peut pas encaisser un
        retrait.
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

function CloseCash({ expected }: { expected: number }) {
  const [value, setValue] = useState("");
  const [closeCash, { isLoading, error }] = useCloseCashMutation();
  const amount = toAmount(value);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (Number.isInteger(amount) && amount >= 0) closeCash({ countedCash: amount });
  };
  return (
    <form onSubmit={submit} className="card max-w-md space-y-4 p-5">
      <h2 className="text-lg">Fermer la journée</h2>
      <p className="text-sm text-ink-muted">
        Comptez tout l&apos;argent du tiroir. Attendu : <strong>{formatPrice(expected)}</strong>. Une fois fermée, la journée ne
        change plus.
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

function Movements({ movements }: { movements: CashMovement[] }) {
  return (
    <section aria-labelledby="movements-title" className="card p-5">
      <h2 id="movements-title" className="text-lg">
        Mouvements du jour
      </h2>
      {movements.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">Aucun paiement pour l&apos;instant.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line text-sm">
          {movements.map((movement) => (
            <li key={movement.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <span>
                <span className="tabular-nums text-ink-muted">{time(movement.createdAt)}</span> {KIND_LABELS[movement.kind]}
                {movement.orderId ? (
                  <>
                    {" · "}
                    <Link href={`/admin/commandes/${movement.orderId}`} className="text-blue-ink underline">
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
