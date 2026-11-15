"use client";

import { useState, type FormEvent } from "react";
import { usePublishTradeInMutation, type TradeInRow } from "@/features/admin/api/exchangeApi";
import { errorMessage } from "@/lib/errors";
import { formatOptions, formatPrice } from "@/lib/format";
import { marginText, resaleProblem, resalePrice, sheetSummary } from "./tradeInView";

const dayLabel = (iso: string) => {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

// Une reprise du client (lot 5) : son téléphone, ce que le magasin lui a donné, et le champ où l'admin fixe le
// prix de revente. « Mettre en vente » en fait une affaire dans la fiche du modèle, et la reprise quitte la liste.
export default function TradeInCard({ tradeIn, onPublished }: { tradeIn: TradeInRow; onPublished: (name: string) => void }) {
  const [price, setPrice] = useState("");
  const [publish, { isLoading, error }] = usePublishTradeInMutation();
  const pending = tradeIn.listedAt === null;
  const problem = resaleProblem(price);
  const margin = marginText(resalePrice(price), tradeIn.price);
  const options = { ...tradeIn.sheet.options, Couleur: tradeIn.color };
  const name = `${tradeIn.deviceModel.brand} ${tradeIn.deviceModel.name}`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem) return;
    try {
      await publish({ id: tradeIn.id, price: resalePrice(price) }).unwrap();
      onPublished(name);
    } catch {
      // L'erreur RTK Query est affichée sous le champ ; la reprise reste dans la liste.
    }
  }

  return (
    <li className="card space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl">{name}</h2>
          <p className="text-sm text-ink-muted">{formatOptions(options)}</p>
        </div>
        <p className="font-display text-lg font-bold tabular-nums">Repris à {formatPrice(tradeIn.price)}</p>
      </div>
      <p className="text-sm">{sheetSummary(tradeIn.sheet) || "Fiche d'état sans détail"}</p>
      <p className="text-sm text-ink-muted">
        Échange n° {tradeIn.dailyNumber} du {dayLabel(tradeIn.businessDate)} · {tradeIn.customerName} · {tradeIn.customerPhone}
      </p>

      {pending ? (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3 border-t border-line pt-3">
          <label className="block text-sm font-semibold">
            <span className="label">Prix de revente (DA)</span>
            <input
              className="input w-48"
              inputMode="numeric"
              aria-label={`Prix de revente de ${name}`}
              value={price}
              onChange={(event) => setPrice(event.target.value.replace(/\D/g, ""))}
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={isLoading || problem !== null}>
            {isLoading ? "Mise en vente…" : "Mettre en vente"}
          </button>
          {margin ? (
            <p className="pb-2 text-sm font-semibold" aria-live="polite">
              {margin}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="field-error w-full">
              {errorMessage(error)}
            </p>
          ) : null}
        </form>
      ) : (
        <p className="border-t border-line pt-3 text-sm font-semibold">
          En vente depuis le {tradeIn.listedAt ? dayLabel(tradeIn.listedAt.slice(0, 10)) : ""}.
        </p>
      )}
    </li>
  );
}
