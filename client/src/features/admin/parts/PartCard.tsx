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

// Une pièce de l'atelier, en CARTE (21/11, avant : une ligne) : le nom, les deux prix, le stock en pastille (rouge
// « Épuisée » à 0 : la pièce reste affichée pour qu'on voie ce qu'il faut racheter), puis les gestes en bas. La page
// range les cartes en grille. `categoryName` : montré seulement dans une recherche, qui traverse les catégories.
export default function PartCard({ part, categoryName }: { part: PartRow; categoryName?: string }) {
  const [open, setOpen] = useState<"arrival" | "edit" | "journal" | null>(null);
  const close = () => setOpen(null);
  const out = isOutOfStock(part);
  // Le technicien crée des pièces et enregistre des arrivages ; modifier une pièce (prix) est à l'admin.
  const caps = repairCapabilities(useAdminRole());

  return (
    <li className="card flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {categoryName ? <p className="text-xs font-semibold uppercase tracking-wide text-blue-ink">{categoryName}</p> : null}
          <h2 className="font-display text-base font-bold leading-snug">{part.name}</h2>
        </div>
        {out ? (
          <span className="shrink-0 rounded-full bg-red px-2.5 py-0.5 text-xs font-bold text-on-red">Épuisée</span>
        ) : (
          <span className="shrink-0 rounded-full border border-line px-2.5 py-0.5 text-xs font-bold tabular-nums">{part.stock} en stock</span>
        )}
      </div>
      <p className="text-sm text-ink-muted tabular-nums">
        Achat {formatPrice(part.purchasePrice)} · Vente {formatPrice(part.salePrice)}
      </p>
      <div className="mt-auto flex flex-wrap gap-1.5">
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
