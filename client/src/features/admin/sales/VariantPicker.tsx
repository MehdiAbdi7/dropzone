"use client";

import { useState, type ReactNode } from "react";
import { CONDITION_LABELS } from "@/config/catalog";
import { useCategoriesQuery } from "@/features/admin/api/catalogApi";
import { useSearchVariantsQuery } from "@/features/admin/api/salesApi";
import { formatOptions, formatPrice } from "@/lib/format";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import type { VariantHit } from "./ticket";

// Le sélecteur de variantes du comptoir (16/11, lot 3, refait le 17/11) : on trouve l'appareil exact
// de trois façons qui se combinent. Taper des mots (« coque iphone », « samsung 256 », un SKU : tous
// les mots doivent se retrouver, dans n'importe quel ordre, dans le nom, la marque, la catégorie ou
// les options). Filtrer par catégorie et par état. Ou ne rien taper et parcourir la liste. N'offre
// que ce qui est publié et en stock. Sert la page Vente et la fenêtre « Modifier » d'une commande.
const PAGE = 50;
const MAX = 200;

type ConditionFilter = "new" | "refurbished" | undefined;
const CONDITION_FILTERS: { value: ConditionFilter; label: string }[] = [
  { value: undefined, label: "Tous les états" },
  { value: "new", label: "Neuf" },
  { value: "refurbished", label: "Affaire" },
];

export default function VariantPicker({
  onPick,
  disabledSkus = [],
  label = "Chercher un appareil",
}: {
  onPick: (hit: VariantHit) => void;
  // Les SKU qu'on ne peut pas (re)choisir ici : leur bouton est grisé avec la raison.
  disabledSkus?: string[];
  label?: string;
}) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [condition, setCondition] = useState<ConditionFilter>(undefined);
  const [limit, setLimit] = useState(PAGE);
  // La recherche attend une pause dans la saisie : chaque touche relancerait la requête.
  const search = useDebouncedValue(text.trim());
  // Un seul caractère ne cherche rien de précis (l'API le refuse) : on garde la liste sans mot.
  const q = search.length < 2 ? "" : search;
  const { data: categories } = useCategoriesQuery();
  const { data, isFetching, isError } = useSearchVariantsQuery({ q, category, condition, limit });

  const pickCategory = (value: string | undefined) => {
    setCategory(value);
    setLimit(PAGE);
  };
  const pickCondition = (value: ConditionFilter) => {
    setCondition(value);
    setLimit(PAGE);
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="label">{label}</span>
        <input
          className="input"
          type="search"
          autoComplete="off"
          // 60 caractères au plus, comme l'API : au-delà elle répondrait 400 (« la recherche ne répond pas »).
          maxLength={60}
          placeholder="Un ou plusieurs mots : coque iphone, samsung 256, SKU…"
          value={text}
          // Entrée (une douchette l'envoie) ne doit jamais valider le formulaire qui contient ce champ.
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          onChange={(event) => {
            setText(event.target.value);
            setLimit(PAGE);
          }}
        />
      </label>

      <div className="space-y-2">
        <div role="group" aria-label="Catégorie" className="flex flex-wrap gap-2">
          <Chip selected={category === undefined} onClick={() => pickCategory(undefined)}>
            Tout
          </Chip>
          {categories?.map((item) => (
            <Chip key={item.slug} selected={category === item.slug} onClick={() => pickCategory(item.slug)}>
              {item.name}
            </Chip>
          ))}
        </div>
        <div role="group" aria-label="État" className="flex flex-wrap gap-2">
          {CONDITION_FILTERS.map((item) => (
            <Chip key={item.label} selected={condition === item.value} onClick={() => pickCondition(item.value)}>
              {item.label}
            </Chip>
          ))}
        </div>
      </div>

      <div aria-live="polite" aria-busy={isFetching}>
        {isError ? (
          <p role="alert" className="field-error">
            La recherche ne répond pas, réessayez.
          </p>
        ) : data && data.hits.length === 0 && !isFetching ? (
          <p className="text-sm text-ink-muted">Aucun appareil en stock pour cette recherche.</p>
        ) : data ? (
          <p className="text-sm text-ink-muted">
            {data.hits.length < data.total
              ? `${data.hits.length} affichés sur ${data.total}`
              : `${data.total} ${data.total > 1 ? "résultats" : "résultat"}`}
          </p>
        ) : null}
        {/* La liste défile dans sa boîte : la page reste en place, le ticket reste visible. */}
        <ul className="mt-2 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {data?.hits.map((hit) => {
            const disabled = disabledSkus.includes(hit.sku);
            return (
              <li key={hit.sku}>
                <button
                  type="button"
                  className="card flex w-full items-center justify-between gap-3 p-3 text-left disabled:opacity-50"
                  disabled={disabled}
                  onClick={() => onPick(hit)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{hit.productName}</span>
                    <span className="block text-sm text-ink-muted">
                      {CONDITION_LABELS[hit.condition]}
                      {Object.keys(hit.options).length ? ` · ${formatOptions(hit.options)}` : ""}
                    </span>
                    <span className="block text-xs text-ink-muted">
                      {hit.sku} · {hit.stock} en stock
                      {disabled ? " · déjà dans la commande" : ""}
                    </span>
                  </span>
                  <span className="shrink-0 font-display font-bold tabular-nums">{formatPrice(hit.price)}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {data && data.hits.length < data.total ? (
          limit < MAX ? (
            <button
              type="button"
              className="btn mt-3 w-full"
              disabled={isFetching}
              onClick={() => setLimit((current) => Math.min(current + PAGE, MAX))}
            >
              Afficher plus
            </button>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">
              Il y en a encore {data.total - data.hits.length} : ajoutez un mot ou un filtre pour les trouver.
            </p>
          )
        ) : null}
      </div>
    </div>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`btn ${selected ? "btn-primary" : ""} px-3 py-1 text-sm`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
