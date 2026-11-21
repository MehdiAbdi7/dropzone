"use client";

import { useState } from "react";
import EditDialog from "@/features/admin/products/EditDialog";
import PartCategoriesPanel from "./PartCategoriesPanel";
import { PartForm } from "./PartFormDialog";

type Tab = "part" | "categories";

// « Ajout et personnalisation » (21/11) : tout ce qui se règle à la main sur la page Pièces, dans une seule fenêtre,
// sans page de plus. « Nouvelle pièce » : on clique la catégorie, puis on crée la pièce dedans (comme pour un
// produit). « Catégories » : on les ajoute, on les renomme, on les supprime (admin seul : le technicien ne voit que
// la création d'une pièce).
export default function PartsManagerDialog({
  open,
  onClose,
  activeCategoryId,
  canEditCategories,
}: {
  open: boolean;
  onClose: () => void;
  // La catégorie ouverte sur la page : la pièce créée y est rangée d'office.
  activeCategoryId: number | null;
  canEditCategories: boolean;
}) {
  return (
    <EditDialog open={open} title="Ajout et personnalisation" size="sm" onClose={onClose}>
      <Body activeCategoryId={activeCategoryId} canEditCategories={canEditCategories} />
    </EditDialog>
  );
}

// Monté seulement fenêtre ouverte (EditDialog) : chaque ouverture repart sur « Nouvelle pièce ».
function Body({ activeCategoryId, canEditCategories }: { activeCategoryId: number | null; canEditCategories: boolean }) {
  const [tab, setTab] = useState<Tab>("part");
  // `created` : le nom de la dernière pièce créée, pour confirmer ; `round` remet le formulaire à zéro pour la suivante.
  const [created, setCreated] = useState<string | null>(null);
  const [round, setRound] = useState(0);

  return (
    <div className="space-y-5 p-5">
      {canEditCategories ? (
        <div role="group" aria-label="Que veux-tu régler ?" className="flex gap-2">
          <button type="button" className="chip" aria-pressed={tab === "part"} onClick={() => setTab("part")}>
            Nouvelle pièce
          </button>
          <button type="button" className="chip" aria-pressed={tab === "categories"} onClick={() => setTab("categories")}>
            Catégories
          </button>
        </div>
      ) : null}

      {tab === "part" ? (
        <div className="space-y-4">
          {created ? (
            <p role="status" className="rounded-lg bg-blue-soft px-3 py-2 text-sm font-semibold text-blue-ink">
              « {created} » est créée. Tu peux en ajouter une autre.
            </p>
          ) : null}
          <PartForm
            key={round}
            initialCategoryId={activeCategoryId}
            onDone={(name) => {
              setCreated(name);
              setRound((value) => value + 1);
            }}
          />
        </div>
      ) : (
        <PartCategoriesPanel />
      )}
    </div>
  );
}
