"use client";

import { useState } from "react";
import type { ExchangeDone as Done } from "@/features/admin/api/exchangeApi";
import ExchangeDone from "@/features/admin/exchange/ExchangeDone";
import { emptyTradeIn, type TradeInDraft } from "@/features/admin/exchange/exchange";
import TradeInForm from "@/features/admin/exchange/TradeInForm";
import SaleTicket from "@/features/admin/sales/SaleTicket";
import VariantPicker from "@/features/admin/sales/VariantPicker";
import { addToTicket, type TicketLine } from "@/features/admin/sales/ticket";

// L'échange (lot 5, 15/11) : le client rend un téléphone et en prend un autre. Le vendeur choisit ce que le
// magasin donne (comme un ticket de vente, prix négociable), puis saisit le téléphone du client, au
// prix de reprise qu'il fixe à la main. La différence passe dans la caisse du jour.
export default function ExchangePage() {
  const [lines, setLines] = useState<TicketLine[]>([]);
  const [tradeIn, setTradeIn] = useState<TradeInDraft>(() => emptyTradeIn());
  const [done, setDone] = useState<Done | null>(null);
  // Un compteur pour repartir d'un formulaire vierge après chaque échange (nom, téléphone, moyen…).
  const [round, setRound] = useState(0);

  function finish(exchange: Done) {
    setDone(exchange);
    setLines([]);
  }
  function startAgain() {
    setDone(null);
    setTradeIn(emptyTradeIn());
    setRound((current) => current + 1);
  }

  return (
    <div className="max-w-6xl space-y-6">
      <h1 className="text-3xl">Échange</h1>
      {done ? (
        <ExchangeDone exchange={done} onNew={startAgain} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section aria-label="Choisir ce que le magasin donne">
            <VariantPicker onPick={(hit) => setLines((current) => addToTicket(current, hit))} />
          </section>
          <SaleTicket
            key={round}
            lines={lines}
            setLines={setLines}
            exchange={{ tradeIn, form: <TradeInForm draft={tradeIn} onChange={setTradeIn} /> }}
            onDone={finish}
          />
        </div>
      )}
    </div>
  );
}
