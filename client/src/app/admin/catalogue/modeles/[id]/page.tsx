"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useModelColorsQuery } from "@/features/admin/api/colorsApi";
import ColorTileAdmin from "@/features/admin/catalog/ColorTileAdmin";
import Breadcrumb from "@/features/shop/Breadcrumb";
import { errorMessage } from "@/lib/errors";

// Écran 4 du Catalogue (étape Couleur, 05/11) : les couleurs d'un modèle, chacune avec sa
// photo et son stock. On ajoute un exemplaire depuis la page d'une couleur.
export default function CatalogModelPage() {
  const id = Number(useParams<{ id: string }>().id);
  const { data, isLoading, error } = useModelColorsQuery(id);

  if (isLoading) {
    return <p className="text-ink-muted">Chargement…</p>;
  }
  if (error || !data) {
    return <p className="field-error">{error ? errorMessage(error) : "Modèle introuvable"}</p>;
  }
  const { model, productId, colors } = data;

  return (
    <div className="max-w-5xl space-y-6">
      <Breadcrumb
        items={[
          { label: "Catalogue", href: "/admin/catalogue" },
          ...(model.series ? [{ label: model.series.name, href: `/admin/catalogue/series/${model.series.id}` }] : []),
          { label: model.name },
        ]}
      />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-muted">{model.brand}</p>
          <h1 className="text-2xl">{model.name}</h1>
        </div>
        {productId ? (
          <Link href={`/admin/produits/${productId}`} className="btn btn-outline btn-small">
            Ouvrir la fiche produit
          </Link>
        ) : null}
      </header>

      {colors.length === 0 ? (
        <p className="card p-4 text-sm text-ink-muted">
          Ce modèle n&apos;a pas encore de couleur. Ajoutez-en dans la page de sa série (« Couleurs officielles »), ou
          enregistrez un exemplaire avec une couleur dans la fiche produit : elle s&apos;ajoutera ici.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {colors.map((color) => (
            <ColorTileAdmin
              key={color.name}
              href={`/admin/catalogue/modeles/${model.id}/couleurs/${encodeURIComponent(color.name)}`}
              kind={model.kind}
              {...color}
            />
          ))}
        </div>
      )}
    </div>
  );
}
