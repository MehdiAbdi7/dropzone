"use client";

import { useState } from "react";
import type { PhoneOrderDone as PhoneDone } from "@/features/admin/api/phoneOrderApi";
import type { SaleDone as Done } from "@/features/admin/api/salesApi";
import PhoneOrderDone from "@/features/admin/sales/PhoneOrderDone";
import PhoneOrderForm from "@/features/admin/sales/PhoneOrderForm";
import { emptyPhoneDraft, type PhoneOrderDraft } from "@/features/admin/sales/phoneOrder";
import SaleDone from "@/features/admin/sales/SaleDone";
import SaleTicket from "@/features/admin/sales/SaleTicket";
import ShopPicker from "@/features/admin/sales/ShopPicker";
import { addToTicket, type TicketLine } from "@/features/admin/sales/ticket";

// Ce que le vendeur saisit : une vente au comptoir (encaissée tout de suite), ou une commande reçue par
// téléphone (19/11), livraison ou réservation, qui démarre « À confirmer » (ou « Réservée »).
type Kind = "store" | "delivery" | "pickup";
const KINDS: { kind: Kind; label: string }[] = [
  { kind: "store", label: "Magasin" },
  { kind: "delivery", label: "Livraison" },
  { kind: "pickup", label: "Réservation" },
];

// La vente au magasin (16/11, lot 3) : le vendeur cherche l'appareil, l'ajoute au ticket, négocie le
// prix au besoin, saisit le client et le moyen de paiement, et encaisse dans la caisse du jour.
// Pour un client qui appelle, le même ticket crée une livraison ou une réservation, sans encaisser.
export default function StoreSalePage() {
  const [lines, setLines] = useState<TicketLine[]>([]);
  const [kind, setKind] = useState<Kind>("store");
  // Une fiche par mode : changer de mode ne fait pas perdre ce qui est déjà saisi.
  const [drafts, setDrafts] = useState<Record<"delivery" | "pickup", PhoneOrderDraft>>({
    delivery: emptyPhoneDraft("delivery"),
    pickup: emptyPhoneDraft("pickup"),
  });
  const [done, setDone] = useState<Done | null>(null);
  const [phoneDone, setPhoneDone] = useState<PhoneDone | null>(null);
  // Un compteur pour repartir d'un formulaire vierge après chaque vente (nom, téléphone, moyen…).
  const [round, setRound] = useState(0);

  function finish(sale: Done) {
    setDone(sale);
    setLines([]);
  }
  function finishPhone(order: PhoneDone) {
    setPhoneDone(order);
    setLines([]);
  }
  function startAgain() {
    setDone(null);
    setPhoneDone(null);
    setDrafts({ delivery: emptyPhoneDraft("delivery"), pickup: emptyPhoneDraft("pickup") });
    setRound((current) => current + 1);
  }

  const picker = <ShopPicker onPick={(hit) => setLines((current) => addToTicket(current, hit))} />;

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl sm:text-3xl">{kind === "store" ? "Vente au magasin" : "Commande par téléphone"}</h1>
      {/* Magasin : on encaisse. Livraison ou Réservation : un client a appelé, la commande attend sa confirmation. */}
      {done || phoneDone ? null : (
        <div role="group" aria-label="Type de commande" className="flex flex-wrap gap-2">
          {KINDS.map((item) => (
            <button
              key={item.kind}
              type="button"
              aria-pressed={kind === item.kind}
              className={`btn btn-small ${kind === item.kind ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setKind(item.kind)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      {done ? (
        <SaleDone sale={done} onNew={startAgain} />
      ) : phoneDone ? (
        <PhoneOrderDone order={phoneDone} onNew={startAgain} />
      ) : kind === "store" ? (
        <SaleTicket key={round} lines={lines} setLines={setLines} picker={picker} onDone={finish} />
      ) : (
        <SaleTicket
          key={round}
          lines={lines}
          setLines={setLines}
          picker={picker}
          phoneOrder={{
            draft: drafts[kind],
            form: (estimatedFee) => (
              <PhoneOrderForm
                draft={drafts[kind]}
                estimatedFee={estimatedFee}
                onChange={(changes) => setDrafts((current) => ({ ...current, [kind]: { ...current[kind], ...changes } }))}
              />
            ),
          }}
          onDone={finishPhone}
        />
      )}
    </div>
  );
}
