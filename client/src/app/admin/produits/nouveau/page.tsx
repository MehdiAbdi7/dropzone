"use client";

import Link from "next/link";
import ProductForm from "@/features/admin/products/ProductForm";
import { emptyDraft } from "@/features/admin/products/productDraft";

export default function NewProductPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/admin/produits" className="text-sm text-blue-ink underline">
        Produits
      </Link>
      <h1 className="text-3xl">Nouveau produit</h1>
      <ProductForm initial={emptyDraft()} />
    </div>
  );
}
