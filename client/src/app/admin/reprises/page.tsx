"use client";

import { useState } from "react";
import { useTradeInsQuery, type TradeInStatus } from "@/features/admin/api/exchangeApi";
import TradeInCard from "@/features/admin/exchange/TradeInCard";
import { errorMessage } from "@/lib/errors";

// Les reprises (lot 5, 15/11) : les téléphones que des clients ont rendus en échange. Une reprise entre en
// stock mais PAS en vente : elle attend ici, hors du site, jusqu'à ce que l'admin fixe son prix de revente.
// « Mettre en vente » en fait une affaire dans la fiche de son modèle ; son prix d'achat est le prix de reprise.
export default function TradeInsPage() {
  const [status, setStatus] = useState<TradeInStatus>("pending");
  const [published, setPublished] = useState<string | null>(null);
  const list = useTradeInsQuery(status);
  // Le nombre à mettre en vente, vu depuis l'autre onglet aussi.
  const pending = useTradeInsQuery("pending");

  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl">Reprises</h1>
        <p className="text-ink-muted">
          Les téléphones rendus par les clients lors d&apos;un échange. Ils ne sont pas sur le site tant que tu n&apos;as pas fixé
          leur prix de revente.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Reprises à afficher">
        <button type="button" className="chip" aria-pressed={status === "pending"} onClick={() => setStatus("pending")}>
          À mettre en vente{pending.data ? ` (${pending.data.length})` : ""}
        </button>
        <button type="button" className="chip" aria-pressed={status === "listed"} onClick={() => setStatus("listed")}>
          Déjà en vente
        </button>
      </div>

      {published ? (
        <p role="status" className="rounded-md bg-surface-2 p-3 font-semibold">
          « {published} » est en vente : elle est dans la fiche de son modèle, au prix que tu as fixé.
        </p>
      ) : null}

      {list.error ? (
        <p role="alert" className="field-error">
          {errorMessage(list.error)}
        </p>
      ) : list.isLoading ? (
        <p className="text-ink-muted">Chargement…</p>
      ) : list.data?.length ? (
        <ul className="space-y-4">
          {list.data.map((tradeIn) => (
            <TradeInCard key={tradeIn.id} tradeIn={tradeIn} onPublished={setPublished} />
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted">
          {status === "pending" ? "Aucune reprise à mettre en vente." : "Aucune reprise n'a encore été mise en vente."}
        </p>
      )}
    </div>
  );
}
