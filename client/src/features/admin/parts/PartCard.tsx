"use client";

import { useState } from "react";
import type { PartRow } from "@/features/admin/api/partsApi";
import { formatPrice } from "@/lib/format";
import ArrivalDialog from "./ArrivalDialog";
import PartFormDialog from "./PartFormDialog";
import PartJournalDialog from "./PartJournalDialog";
import { useAdminRole } from "@/features/admin/AdminRoleContext";
import { repairCapabilities } from "@/features/admin/repairs/repairsView";
import { isOutOfStock } from "./partsView";

// Une pièce de l'atelier, en UNE ligne (refonte du 19/11) : le nom et les deux prix à gauche, le stock en pastille
// (rouge « Épuisée » à 0 : la pièce reste dans la liste pour qu'on voie ce qu'il faut racheter), les gestes à droite.
// La page les range dans une seule liste à filets ; sur téléphone, les gestes passent sous le nom.
export default function PartCard({ part }: { part: PartRow }) {
  const [open, setOpen] = useState<"arrival" | "edit" | "journal" | null>(null);
  const close = () => setOpen(null);
  const out = isOutOfStock(part);
  // Le technicien crée des pièces et enregistre des arrivages ; modifier une pièce (prix) est à l'admin.
  const caps = repairCapabilities(useAdminRole());

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1 basis-56">
        <h2 className="truncate font-display text-base font-bold">{part.name}</h2>
        <p className="text-xs text-ink-muted tabular-nums">
          Achat {formatPrice(part.purchasePrice)} · Vente {formatPrice(part.salePrice)}
        </p>
      </div>
      {out ? (
        <span className="rounded-full bg-red px-2.5 py-0.5 text-xs font-bold text-on-red">Épuisée</span>
      ) : (
        <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-bold tabular-nums">{part.stock} en stock</span>
      )}
      <div className="flex gap-1.5">
        <button type="button" className="btn btn-primary btn-small" onClick={() => setOpen("arrival")}>
          + Arrivage
        </button>
        {caps.editsPart ? (
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setOpen("edit")}>
            Modifier
          </button>
        ) : null}
        <button type="button" className="btn btn-secondary btn-small" onClick={() => setOpen("journal")}>
          Journal
        </button>
      </div>
      <ArrivalDialog open={open === "arrival"} part={part} onClose={close} />
      <PartFormDialog open={open === "edit"} part={part} onClose={close} />
      <PartJournalDialog open={open === "journal"} part={part} onClose={close} />
    </li>
  );
}
