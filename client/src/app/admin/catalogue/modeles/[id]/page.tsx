"use client";

import { useParams } from "next/navigation";
import RedirectToFiche from "@/features/admin/catalog/RedirectToFiche";

// Ancienne page « Couleurs & stock » d'un modèle : fusionnée avec la fiche produit (24/11).
export default function CatalogModelPage() {
  return <RedirectToFiche modelId={Number(useParams<{ id: string }>().id)} />;
}
