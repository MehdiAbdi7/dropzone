import Link from "next/link";

export type Crumb = { label: string; href?: string };

// Le fil d'Ariane de la Boutique : Boutique › Smartphones › iPhone › iPhone 18 Pro Max › Neuf.
// Le dernier élément est la page en cours, sans lien.
export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="text-sm text-ink-muted">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.href && !last ? (
                <Link href={item.href} className="hover:text-ink">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "font-semibold text-ink" : undefined}>
                  {item.label}
                </span>
              )}
              {last ? null : <span aria-hidden="true">›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
