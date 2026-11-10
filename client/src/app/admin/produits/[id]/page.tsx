"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useAdminProductQuery, useDeleteProductMutation } from "@/features/admin/adminApi";
import ImageManager from "@/features/admin/products/ImageManager";
import ProductForm from "@/features/admin/products/ProductForm";
import { draftFromProduct } from "@/features/admin/products/productDraft";
import { errorMessage } from "@/lib/errors";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const created = useSearchParams().get("cree") === "1";
  const photoError = useSearchParams().get("photoErreur") === "1";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">{product.name}</h1>
        {product.status === "published" ? (
          <Link href={`/produits/${product.slug}`} className="btn btn-secondary btn-small" target="_blank">
            Voir sur la boutique
          </Link>
        ) : null}
      </div>
      {created ? (
        <p role="status" className="rounded-lg border border-blue-ink bg-blue-soft p-3 font-semibold">
          Produit créé. {photoError ? "La photo n’a pas pu être envoyée ; réessayez ci-dessous." : "Vous pouvez compléter ses photos ci-dessous."}
        </p>
      ) : null}

      {savedAt ? (
        <p role="status" className="rounded-lg border border-blue-ink bg-blue-soft p-3 font-semibold">
          Modifications enregistrées.
        </p>
      ) : null}

      <ImageManager product={product} />
      {/* key : quand les variantes changent (une nouvelle reçoit son id du serveur),
          le formulaire repart des données relues, sinon il recréerait la variante. */}
      <ProductForm
        key={product.variants.map((variant) => variant.id).join("-")}
        productId={product.id}
        initial={draftFromProduct(product)}
        ownSkus={product.variants.map((variant) => variant.sku)}
        onSaved={() => setSavedAt(Date.now())}
      />

      <section className="card space-y-3 p-5">
        <h2 className="text-xl">Supprimer le produit</h2>
        <p className="text-sm text-ink-muted">
          Les commandes passées restent intactes : elles ont recopié le nom, la référence et le prix.
        </p>
        <ConfirmDialog
          trigger="Supprimer le produit"
          title={`Supprimer « ${product.name} » ?`}
          confirmLabel="Supprimer"
          onConfirm={async () => {
            try {
              await deleteProduct(product.id).unwrap();
              router.push("/admin/produits");
            } catch {
              // Affiché sous le bouton.
            }
          }}
        >
          Ses variantes et ses photos seront supprimées. Cette action ne se défait pas.
        </ConfirmDialog>
        {deleteError ? <p className="field-error">{errorMessage(deleteError)}</p> : null}
      </section>
    </div>
  );
}
