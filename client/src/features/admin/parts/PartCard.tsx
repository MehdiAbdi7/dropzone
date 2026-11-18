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

// Une pièce de l'atelier : son stock bien visible (« Épuisée » en rouge à 0, la pièce reste dans la liste pour
// qu'on voie ce qu'il faut racheter), ses deux prix et trois boutons qui ouvrent chacun leur fenêtre.
export default function PartCard({ part }: { part: PartRow }) {
  const [open, setOpen] = useState<"arrival" | "edit" | "journal" | null>(null);
  const close = () => setOpen(null);
  const out = isOutOfStock(part);
  // Le technicien crée des pièces et enregistre des arrivages ; modifier une pièce (prix) est à l'admin.
  const caps = repairCapabilities(useAdminRole());

  return (
    <li className="card space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="min-w-0 text-lg sm:text-xl">{part.name}</h2>
        {out ? (
          <span className="rounded-full bg-red px-3 py-1 text-sm font-bold text-on-red">Épuisée</span>
        ) : (
          <p className="font-display text-lg font-bold tabular-nums">{part.stock} en stock</p>
        )}
      </div>
      <p className="text-sm text-ink-muted">
        Achat : {formatPrice(part.purchasePrice)} · Vente : {formatPrice(part.salePrice)}
      </p>
      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
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
