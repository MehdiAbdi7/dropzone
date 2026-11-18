"use client";

import { useState } from "react";
import RepairTrackForm from "./RepairTrackForm";
import TrackForm from "./TrackForm";

type Kind = "order" | "repair";

// La page de suivi (18/11, atelier étape 4) : deux choix en haut, « Commande » et « Réparation », puis le même
// formulaire (numéro et téléphone). Changer de choix repart d'un formulaire vierge (`key`) : une commande ne reste
// jamais affichée sous « Réparation ».
export default function TrackChoice({ initialKind, initialNumber }: { initialKind: Kind; initialNumber?: string }) {
  const [kind, setKind] = useState<Kind>(initialKind);
  return (
    <div className="space-y-6">
      <div role="group" aria-label="Que voulez-vous suivre ?" className="flex flex-wrap gap-2">
        <button type="button" className="chip" aria-pressed={kind === "order"} onClick={() => setKind("order")}>
          Commande
        </button>
        <button type="button" className="chip" aria-pressed={kind === "repair"} onClick={() => setKind("repair")}>
          Réparation
        </button>
      </div>
      {kind === "order" ? <TrackForm key="order" initialNumber={initialNumber} /> : <RepairTrackForm key="repair" />}
    </div>
  );
}
