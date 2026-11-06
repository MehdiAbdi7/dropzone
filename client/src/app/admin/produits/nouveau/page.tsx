"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ProductForm from "@/features/admin/products/ProductForm";
import { emptyDraft } from "@/features/admin/products/productDraft";

// « Créer la fiche » depuis le Catalogue arrive ici avec le modèle, sa catégorie, sa marque
// et son nom dans l'adresse : le formulaire est déjà rempli. « Nouvel accessoire » (page d'un
// type, 06/11) n'envoie que la catégorie et le type.
function NewProductForm() {
  const params = useSearchParams();
  const deviceModelId = Number(params.get("modele")) || null;
  const categoryId = Number(params.get("categorie"));
  const brandId = Number(params.get("marque"));
  const prefill = categoryId && brandId ? { deviceModelId, categoryId, brandId, name: params.get("nom") ?? "" } : undefined;
  return <ProductForm initial={emptyDraft(prefill)} />;
}

export default function NewProductPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/admin/produits" className="text-sm text-blue-ink underline">
        Produits
      </Link>
      <h1 className="text-3xl">Nouveau produit</h1>
      <Suspense fallback={<p className="text-ink-muted">Chargement…</p>}>
        <NewProductForm />
      </Suspense>
    </div>
  );
}
