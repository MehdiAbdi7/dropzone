import { swatchOf, type Palette } from "@/config/colors";
import { formatPrice } from "@/lib/format";
import { usePalette } from "../usePalette";
import type { VariantDraft } from "./productDraft";
import { byColor, optionsWithoutColor, variantGroups, variantProblems, type ColorGroup, type VariantGroup } from "./variantGroups";

// Les variantes de la fiche (refaites le 23/11) : le neuf scellé et l'occasion dans deux listes séparées, chacune avec
// son stock total et son bouton d'ajout. Une ligne courte par variante (options, SKU, prix, stock, ce qui manque) ; un
// clic ouvre sa fenêtre. Un accessoire ne se vend que neuf : pas de liste Occasion.
// Dans chaque liste, les variantes sont regroupées par couleur (23/11) : un en-tête avec la pastille de la teinte (celle
// réglée dans Listes), le nom et le stock de la couleur ; la ligne ne dit plus que les autres options.
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
  const palette = usePalette();
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
        palette={palette}
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
          palette={palette}
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
  palette,
}: {
  tone: "new" | "used";
  title: string;
  empty: string;
  addLabel: string;
  group: VariantGroup;
  stockText: (stock: number) => string;
  onAdd: () => void;
  onEdit: (key: string) => void;
  palette: Palette;
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
        <div className="space-y-3">
          {byColor(group.variants).map((colorGroup) => (
            <ColorBlock key={colorGroup.color ?? "sans-couleur"} group={colorGroup} palette={palette} stockText={stockText} onEdit={onEdit} />
          ))}
        </div>
      )}
    </section>
  );
}

// Les variantes d'une couleur : l'en-tête (pastille, nom, stock), puis une ligne par variante. Une couleur sans teinte
// réglée dans Listes a une pastille vide en pointillés : on ne devine pas la teinte.
function ColorBlock({
  group,
  palette,
  stockText,
  onEdit,
}: {
  group: ColorGroup;
  palette: Palette;
  stockText: (stock: number) => string;
  onEdit: (key: string) => void;
}) {
  const hex = group.color ? swatchOf(group.color, palette) : null;
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="flex items-center gap-2.5 bg-surface-2 px-3 py-2 sm:px-4">
        <span
          aria-hidden="true"
          className={`size-5 shrink-0 rounded-full border ${hex ? "border-ink-muted/60 shadow-sm" : "border-dashed border-ink-muted"}`}
          style={hex ? { background: hex } : undefined}
        />
        <span className="min-w-0 truncate font-display text-sm font-bold">{group.color ?? "Sans couleur"}</span>
        <span className="ml-auto shrink-0 text-xs text-ink-muted">
          {group.variants.length} variante{group.variants.length > 1 ? "s" : ""} · {stockText(group.stock)}
        </span>
      </div>
      <ul className="divide-y divide-line border-t border-line">
        {group.variants.map((variant) => (
          <li key={variant.key}>
            <VariantRow variant={variant} onEdit={() => onEdit(variant.key)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// Une ligne cliquable : les options autres que la couleur (déjà dans l'en-tête), le SKU, le prix et le stock.
function VariantRow({ variant, onEdit }: { variant: VariantDraft; onEdit: () => void }) {
  const options = optionsWithoutColor(variant);
  const noOption = Object.keys(variant.options).length === 0;
  // Une variante en brouillon (23/11) : un badge gris et une ligne atténuée, elle n'est pas en vente.
  const isDraft = variant.status === "draft";
  const problems = variantProblems(variant);
  return (
    <button
      type="button"
      onClick={onEdit}
      className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-2.5 text-left transition-colors hover:bg-surface-2 sm:px-4 ${
        isDraft ? "bg-surface-2/60" : "bg-surface"
      }`}
    >
      <span className={`min-w-0 ${isDraft ? "opacity-70" : ""}`}>
        <span className="flex min-w-0 items-center gap-2">
          {isDraft ? (
            <span className="shrink-0 rounded-full border border-dashed border-ink-muted px-2 py-px text-[11px] font-bold uppercase tracking-wide text-ink-muted">
              Brouillon
            </span>
          ) : null}
          <span className="truncate text-sm font-semibold">{options || (noOption ? "Options à choisir" : "Sans autre option")}</span>
        </span>
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
