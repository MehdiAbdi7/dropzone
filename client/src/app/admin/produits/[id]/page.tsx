"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useAdminProductQuery, useDeleteProductMutation } from "@/features/admin/api/productsApi";
import ImageManager from "@/features/admin/products/ImageManager";
import ProductForm from "@/features/admin/products/ProductForm";
import { draftFromProduct } from "@/features/admin/products/productDraft";
import { errorMessage } from "@/lib/errors";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const created = useSearchParams().get("cree") === "1";
  const photoError = useSearchParams().get("photoErreur") === "1";
  // `?liste=neuf` ou `?liste=occasion` : ouvre cette liste d'office (lien du Catalogue).
  const list = useSearchParams().get("liste");
  const router = useRouter();
  const { data: product, isError } = useAdminProductQuery(Number(id));
  const [deleteProduct, { error: deleteError }] = useDeleteProductMutation();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  if (isError) {
    return <p role="alert">Ce produit est introuvable.</p>;
  }
  if (!product) {
    return <p className="text-ink-muted">Chargement…</p>;
  }

  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/admin/produits" className="text-sm text-blue-ink underline">
        Produits
      </Link>
      {/* L'en-tête porte aussi la suppression (23/11) : un petit bouton rouge plutôt qu'une grande carte en bas. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="min-w-0 text-2xl sm:text-3xl">{product.name}</h1>
        <div className="flex flex-wrap gap-2">
          {product.status === "published" ? (
            <Link href={`/produits/${product.slug}`} className="btn btn-secondary btn-small" target="_blank">
              Voir sur la boutique
            </Link>
          ) : null}
          <ConfirmDialog
            trigger="Supprimer"
            triggerClassName="btn btn-small border-red text-red hover:bg-red-soft"
            title={`Supprimer « ${product.name} » ?`}
            confirmLabel="Supprimer"
            onConfirm={async () => {
              try {
                await deleteProduct(product.id).unwrap();
                router.push("/admin/produits");
              } catch {
                // Affiché sous l'en-tête.
              }
            }}
          >
            Ses variantes et ses photos seront supprimées. Les commandes passées restent intactes : elles ont recopié le nom, la
            référence et le prix. Cette action ne se défait pas.
          </ConfirmDialog>
        </div>
      </div>
      {deleteError ? <p className="field-error">{errorMessage(deleteError)}</p> : null}
      {created ? (
        <p role="status" className="rounded-lg border border-blue-ink bg-blue-soft p-3 font-semibold">
          Produit créé. {photoError ? "La photo n’a pas pu être envoyée ; réessayez depuis la tuile Photos." : "Vous pouvez compléter ses photos depuis la tuile Photos."}
        </p>
      ) : null}

      {savedAt ? (
        <p role="status" className="rounded-lg border border-blue-ink bg-blue-soft p-3 font-semibold">
          Modifications enregistrées.
        </p>
      ) : null}

      {/* key : quand les variantes changent (une nouvelle reçoit son id du serveur),
          le formulaire repart des données relues, sinon il recréerait la variante. */}
      <ProductForm
        key={product.variants.map((variant) => variant.id).join("-")}
        productId={product.id}
        initial={draftFromProduct(product)}
        ownSkus={product.variants.map((variant) => variant.sku)}
        onSaved={() => setSavedAt(Date.now())}
        initialList={list === "neuf" ? "new" : list === "occasion" ? "used" : undefined}
        photos={{ count: product.images.length, cover: product.images[0]?.url ?? null, panel: <ImageManager product={product} /> }}
      />

    </div>
  );
}
