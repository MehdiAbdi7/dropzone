import Link from "next/link";
import type { ReactNode } from "react";

// Le stock en deux pastilles : « 5 neufs scellés » (bleu) et « 3 affaires » (rouge).
// Rien n'est affiché pour zéro : la tuile reste lisible.
function StockPills({ newStock, dealCount }: { newStock: number; dealCount: number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {newStock > 0 ? (
        <span className="badge bg-blue-soft text-blue-ink">
          {newStock} neuf{newStock > 1 ? "s" : ""} scellé{newStock > 1 ? "s" : ""}
        </span>
      ) : null}
      {dealCount > 0 ? (
        <span className="badge bg-red-soft text-red">
          {dealCount} affaire{dealCount > 1 ? "s" : ""}
        </span>
      ) : null}
    </div>
  );
}

// Une tuile du Catalogue : une catégorie ou une marque. Avec `href`, toute la tuile est un lien.
export default function CatalogTile({
  href,
  title,
  subtitle,
  icon,
  newStock,
  dealCount,
}: {
  href?: string;
  title: string;
  subtitle: string;
  icon?: ReactNode;
  newStock: number;
  dealCount: number;
}) {
  const body = (
    <>
      {icon ? <div className="flex h-9 items-center">{icon}</div> : null}
      <h2 className="text-lg">{title}</h2>
      <p className="text-sm text-ink-muted">{subtitle}</p>
      <StockPills newStock={newStock} dealCount={dealCount} />
    </>
  );
  const className = "card flex h-full flex-col gap-2 p-4";
  if (!href) {
    return <div className={className}>{body}</div>;
  }
  return (
    <Link href={href} className={`${className} transition-[border-color,box-shadow] hover:border-blue-ink hover:shadow-[var(--shadow)]`}>
      {body}
    </Link>
  );
}

// La tuile en pointillés qui ajoute quelque chose (« + Nouvelle catégorie »).
export function AddTile({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-32 flex-col justify-center gap-3 rounded-xl border-2 border-dashed border-line p-4">{children}</div>;
}
