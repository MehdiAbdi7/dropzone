import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import { kindIcon } from "@/features/shop/colors";
import type { ProductKind } from "@/types/api";

// Une couleur d'un modèle dans le Catalogue : sa photo (ou l'icône de la catégorie), son nom
// et ce qu'il y a en stock. Un clic ouvre la page de la couleur.
export default function ColorTileAdmin({
  href,
  kind,
  name,
  photoUrl,
  newStock,
  refurbishedCount,
}: {
  href: string;
  kind: ProductKind;
  name: string;
  photoUrl: string | null;
  newStock: number;
  refurbishedCount: number;
}) {
  const empty = newStock === 0 && refurbishedCount === 0;
  return (
    <Link
      href={href}
      className="card group flex flex-col gap-2 p-3 transition-[border-color,box-shadow] hover:border-blue-ink hover:shadow-[var(--shadow)]"
    >
      <div className="relative aspect-square overflow-hidden rounded-[10px] bg-surface-2">
        <ProductImage src={photoUrl ?? kindIcon(kind)} alt="" sizes="(min-width: 1024px) 200px, 45vw" />
      </div>
      <p className="text-center font-display font-bold group-hover:text-blue-ink">{name}</p>
      <p className="text-center text-sm text-ink-muted">
        {empty
          ? "Rien en stock"
          : `${newStock} neuf${newStock > 1 ? "s" : ""} · ${refurbishedCount} affaire${refurbishedCount > 1 ? "s" : ""}`}
      </p>
    </Link>
  );
}
