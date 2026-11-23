import { formatPrice } from "@/lib/format";
import type { VariantDraft } from "./productDraft";
import { variantGroups, variantProblems, type VariantGroup } from "./variantGroups";

// Les variantes de la fiche (refaites le 23/11) : le neuf scellé et l'occasion dans deux listes séparées, chacune avec
// son stock total et son bouton d'ajout. Une ligne courte par variante (options, SKU, prix, stock, ce qui manque) ; un
// clic ouvre sa fenêtre. Un accessoire ne se vend que neuf : pas de liste Occasion.
export default function VariantList({
  variants,
  canAddRefurbished,
  onAdd,
  onEdit,
}: {
  variants: VariantDraft[];
  canAddRefurbished: boolean;
  onAdd: (condition: "new" | "refurbished") => void;
  onEdit: (key: string) => void;
}) {
  const { fresh, used } = variantGroups(variants);
  return (
    <div id="variantes" className={`grid scroll-mt-6 gap-4 ${canAddRefurbished ? "xl:grid-cols-2" : ""}`}>
      <VariantGroupCard
        tone="new"
        title="Neuf scellé"
        empty="Aucun neuf scellé. Ajoute une variante par couleur et stockage."
        addLabel="+ Neuf scellé"
        group={fresh}
        stockText={(stock) => `${stock} en stock`}
        onAdd={() => onAdd("new")}
        onEdit={onEdit}
      />
      {canAddRefurbished ? (
        <VariantGroupCard
          tone="used"
          title="Occasion"
          empty="Aucune occasion. Chaque appareil d'occasion a sa propre fiche d'état."
          addLabel="+ Occasion"
          group={used}
          stockText={(stock) => `${stock} appareil${stock > 1 ? "s" : ""}`}
          onAdd={() => onAdd("refurbished")}
          onEdit={onEdit}
        />
      ) : null}
    </div>
  );
}

function VariantGroupCard({
  tone,
  title,
  empty,
  addLabel,
  group,
  stockText,
  onAdd,
  onEdit,
}: {
  tone: "new" | "used";
  title: string;
  empty: string;
  addLabel: string;
  group: VariantGroup;
  stockText: (stock: number) => string;
  onAdd: () => void;
  onEdit: (key: string) => void;
}) {
  const id = `variantes-${tone}`;
  return (
    <section aria-labelledby={id} className="card min-w-0 space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${tone === "new" ? "bg-blue" : "bg-red"}`} />
          <h2 id={id} className="text-lg">
            {title} <span className="text-ink-muted">({group.variants.length})</span>
          </h2>
          {group.variants.length > 0 ? (
            <span className="text-sm text-ink-muted">
              · {stockText(group.stock)}
            </span>
          ) : null}
        </div>
        <button type="button" className="btn btn-secondary btn-small" onClick={onAdd}>
          {addLabel}
        </button>
      </div>
      {group.variants.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-4 text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {group.variants.map((variant) => (
            <li key={variant.key}>
              <VariantRow variant={variant} onEdit={() => onEdit(variant.key)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Une ligne cliquable : sur téléphone, le prix et le stock passent sous les options.
function VariantRow({ variant, onEdit }: { variant: VariantDraft; onEdit: () => void }) {
  const options = Object.values(variant.options).filter(Boolean).join(" · ");
  const problems = variantProblems(variant);
  return (
    <button
      type="button"
      onClick={onEdit}
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 bg-surface px-3 py-2.5 text-left transition-colors hover:bg-surface-2 sm:px-4"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{options || "Options à choisir"}</span>
        <span className="block truncate text-xs text-ink-muted">
          {variant.sku || "SKU à écrire"}
          {variant.reference ? ` · Réf. ${variant.reference}` : ""}
        </span>
      </span>
      <span className="text-right">
        <span className={`block text-sm font-semibold tabular-nums ${variant.price ? "" : "text-red"}`}>
          {variant.price ? formatPrice(Number(variant.price)) : "Prix à saisir"}
        </span>
        <span className="block text-xs text-ink-muted tabular-nums">Stock : {variant.stock || 0}</span>
      </span>
      {problems.length > 0 ? (
        <span className="col-span-2 justify-self-start rounded-full bg-[#ffb547] px-2 py-0.5 text-xs font-bold text-black">
          À compléter : {problems.join(", ")}
        </span>
      ) : null}
    </button>
  );
}
