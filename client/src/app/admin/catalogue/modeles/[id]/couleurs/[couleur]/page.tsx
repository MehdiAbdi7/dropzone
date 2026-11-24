"use client";

import { useParams } from "next/navigation";
import RedirectToFiche from "@/features/admin/catalog/RedirectToFiche";

// Ancienne page d'une couleur d'un modèle : fusionnée avec la fiche produit (24/11).
export default function CatalogColorPage() {
  return <RedirectToFiche modelId={Number(useParams<{ id: string }>().id)} />;
}
