"use client";

import { useState } from "react";
import type { SaleDone as Done } from "@/features/admin/api/salesApi";
import SaleDone from "@/features/admin/sales/SaleDone";
import SaleTicket from "@/features/admin/sales/SaleTicket";
import VariantPicker from "@/features/admin/sales/VariantPicker";
import { addToTicket, type TicketLine } from "@/features/admin/sales/ticket";

// La vente au magasin (16/11, lot 3) : le vendeur cherche l'appareil, l'ajoute au ticket, négocie le
// prix au besoin, saisit le client et le moyen de paiement, et encaisse dans la caisse du jour.
export default function StoreSalePage() {
  const [lines, setLines] = useState<TicketLine[]>([]);
  const [done, setDone] = useState<Done | null>(null);
  // Un compteur pour repartir d'un formulaire vierge après chaque vente (nom, téléphone, moyen…).
  const [round, setRound] = useState(0);

  function finish(sale: Done) {
    setDone(sale);
    setLines([]);
  }
  function startAgain() {
    setDone(null);
    setRound((current) => current + 1);
  }

  return (
    <div className="max-w-6xl space-y-6">
      <h1 className="text-3xl">Vente au magasin</h1>
      {done ? (
        <SaleDone sale={done} onNew={startAgain} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section aria-label="Choisir un appareil">
            <VariantPicker
              onPick={(hit) => setLines((current) => addToTicket(current, hit))}
            />
          </section>
          <SaleTicket key={round} lines={lines} setLines={setLines} onDone={finish} />
        </div>
      )}
    </div>
  );
}
