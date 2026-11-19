import { pageList } from "./pageList";

// La pagination numérotée des listes de commandes (20/11) : « ‹ 1 2 [3] 4 … 24 › ». Masquée quand il n'y a
// qu'une page. Les numéros sont des boutons (la liste se relit sans recharger la page).
export default function OrdersPagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink-muted">
        Page {page} sur {pages}
      </p>
      <div className="flex items-center gap-1">
        <button type="button" className="admin-page" aria-label="Page précédente" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          ‹
        </button>
        {pageList(page, pages).map((item, index) =>
          item === "…" ? (
            <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-ink-muted">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className="admin-page"
              aria-label={`Page ${item}`}
              aria-current={item === page ? "page" : undefined}
              onClick={() => onChange(item)}
            >
              {item}
            </button>
          ),
        )}
        <button type="button" className="admin-page" aria-label="Page suivante" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          ›
        </button>
      </div>
    </nav>
  );
}
