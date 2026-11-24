"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useModelColorsQuery } from "@/features/admin/api/colorsApi";
import { errorMessage } from "@/lib/errors";

// Les anciennes pages « Couleurs & stock » d'un modèle et d'une couleur (avant le 24/11) : elles sont fusionnées avec la
// fiche produit, qui règle maintenant les couleurs, leurs photos et leur stock. Un favori ou un vieux lien arrive ici et
// part vers la fiche du modèle ; sans fiche, vers la page de sa série (la carte du modèle y propose « Créer la fiche »).
export default function RedirectToFiche({ modelId }: { modelId: number }) {
  const router = useRouter();
  const { data, error } = useModelColorsQuery(modelId);
  useEffect(() => {
    if (!data) return;
    router.replace(
      data.productId ? `/admin/produits/${data.productId}` : data.model.series ? `/admin/catalogue/series/${data.model.series.id}` : "/admin/catalogue",
    );
  }, [data, router]);
  if (error) return <p className="field-error">{errorMessage(error)}</p>;
  return <p className="text-ink-muted">Ouverture de la fiche…</p>;
}
