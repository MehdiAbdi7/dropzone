"use client";

import ProductImage from "@/components/ui/ProductImage";
import { CONDITION_LABELS } from "@/config/catalog";
import EditDialog from "@/features/admin/products/EditDialog";
import { formatOptions } from "@/lib/format";
import type { VariantHit } from "./ticket";
import { variantDetailRows } from "./variantDetail";

// La fiche d'un appareil, dans une fenêtre (18/11) : le vendeur répond au client qui demande « il a quoi ? »
// sans quitter la vente. Ouverte quand `hit` existe, fermée quand il est nul. Elle peut s'ouvrir depuis la
// fenêtre de recherche de produit : Échap ou « Terminé » ne ferment alors que celle-ci.
export default function VariantDetailDialog({ hit, onClose }: { hit: VariantHit | null; onClose: () => void }) {
  return (
    <EditDialog open={hit !== null} title={hit?.productName ?? "Détail"} size="sm" onClose={onClose}>
      {hit ? (
        <div className="space-y-4">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-surface-2">
            <ProductImage src={hit.image} alt="" sizes="(min-width: 640px) 28rem, 90vw" />
          </div>
          <p className="text-sm text-ink-muted">
            {CONDITION_LABELS[hit.condition]}
            {Object.keys(hit.options).length ? ` · ${formatOptions(hit.options)}` : ""} · {hit.sku}
          </p>
          <dl className="space-y-2 text-sm">
            {variantDetailRows(hit).map((row) => (
              <div key={row.label} className="flex justify-between gap-4 border-b border-line pb-2 last:border-0">
                <dt className="shrink-0 text-ink-muted">{row.label}</dt>
                <dd className="text-right font-semibold">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </EditDialog>
  );
}
