"use client";

import { useState, type ReactNode } from "react";
import { CONDITION_LABELS } from "@/config/catalog";
import ProductImage from "@/components/ui/ProductImage";
import { useCategoriesQuery } from "@/features/admin/api/catalogApi";
import { useSearchVariantsQuery } from "@/features/admin/api/salesApi";
import { formatOptions, formatPrice } from "@/lib/format";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import type { OnTicket, VariantHit } from "./ticket";
import VariantDetailDialog from "./VariantDetailDialog";

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
  grid = false,
  initialCategory,
  quantities,
  onRemove,
}: {
  onPick: (hit: VariantHit) => void;
  // Retirer un exemplaire du ticket, depuis la carte (le « − »).
  onRemove?: (hit: VariantHit) => void;
  // Ce qui est déjà dans le ticket, par SKU : chaque carte l'affiche (le clic ne doit pas passer inaperçu).
  quantities?: Record<string, OnTicket>;
  // Des cartes avec photo, comme la boutique en ligne (page Vente et Échange), au lieu d'une liste.
  grid?: boolean;
  // Une catégorie déjà choisie à l'ouverture (les accessoires, dans le parcours de la fenêtre).
  initialCategory?: string;
  // Les SKU qu'on ne peut pas (re)choisir ici : leur bouton est grisé avec la raison.
  disabledSkus?: string[];
  label?: string;
}) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<string | undefined>(initialCategory);
  const [condition, setCondition] = useState<ConditionFilter>(undefined);
  const [limit, setLimit] = useState(PAGE);
  // L'appareil dont on regarde la fiche (bouton « Détail » des cartes).
  const [detail, setDetail] = useState<VariantHit | null>(null);
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
        <ul
          className={
            grid
              ? "mt-2 grid max-h-[calc(100dvh-22rem)] min-h-64 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-4"
              : "mt-2 max-h-[60vh] space-y-2 overflow-y-auto pr-1"
          }
        >
          {data?.hits.map((hit) => {
            const disabled = disabledSkus.includes(hit.sku);
            if (grid) {
              return (
                <li key={hit.sku}>
                  <VariantCard hit={hit} disabled={disabled} onTicket={quantities?.[hit.sku]} onPick={onPick} onRemove={onRemove} onDetail={setDetail} />
                </li>
              );
            }
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
      <VariantDetailDialog hit={detail} onClose={() => setDetail(null)} />
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

// La carte d'une variante, comme une carte de la boutique : photo, nom, état et options, prix, stock.
// Depuis le 19/11, on n'ajoute plus en cliquant la carte (trop facile de cliquer deux fois sans le voir) mais avec
// un « + » bien visible en bas ; une fois l'appareil dans le ticket, « − N + » permet de le retirer depuis la
// carte (`onRemove`). Un bouton « Détail » (18/11) est à côté : tous des boutons frères, car un bouton dans un
// bouton n'est pas permis en HTML.
export function VariantCard({
  hit,
  disabled = false,
  onTicket,
  onPick,
  onRemove,
  onDetail,
}: {
  hit: VariantHit;
  disabled?: boolean;
  // Déjà dans le ticket (19/11) : la carte le dit et se cadre, pour qu'on voie que l'ajout a marché.
  onTicket?: OnTicket;
  onPick: (hit: VariantHit) => void;
  // Retirer un exemplaire du ticket ; absent, la carte n'offre que le « + ».
  onRemove?: (hit: VariantHit) => void;
  onDetail?: (hit: VariantHit) => void;
}) {
  const name = hit.productName;
  const stepButton = "btn btn-primary btn-small min-w-11 text-lg font-bold leading-none";
  return (
    <div
      className={`card flex h-full w-full flex-col overflow-hidden ${onTicket ? "border-2 border-blue-ink" : ""}`}
    >
      <div className={`flex flex-1 flex-col text-left ${disabled ? "opacity-50" : ""}`}>
        <span className="relative block aspect-[4/3] w-full bg-surface-2">
          <ProductImage src={hit.image} alt="" sizes="(min-width: 1280px) 15vw, 30vw" />
          {onTicket ? (
            <span className="absolute right-2 top-2 rounded-full bg-blue px-2.5 py-1 text-sm font-bold text-on-brand shadow">
              ✓ {onTicket.quantity} au ticket{onTicket.atLimit ? " · max" : ""}
            </span>
          ) : null}
        </span>
        <span className="flex w-full flex-1 flex-col gap-0.5 p-3">
          <span className="line-clamp-2 font-semibold leading-tight">{name}</span>
          <span className="text-xs text-ink-muted">
            {CONDITION_LABELS[hit.condition]}
            {Object.keys(hit.options).length ? ` · ${formatOptions(hit.options)}` : ""}
          </span>
          <span className="mt-auto flex items-baseline justify-between gap-2 pt-2">
            <span className="font-display font-bold tabular-nums">{formatPrice(hit.price)}</span>
            <span className="text-xs text-ink-muted">{disabled ? "déjà ajouté" : `${hit.stock} en stock`}</span>
          </span>
          {/* La limite de la négociation : visible au vendeur, jamais sur le site. */}
          {hit.purchasePrice != null ? (
            <span className="text-xs text-ink-muted">Achat : {formatPrice(hit.purchasePrice)}</span>
          ) : null}
        </span>
      </div>
      <div className="m-3 mt-0 flex items-center justify-between gap-2">
        {onDetail ? (
          <button type="button" className="btn btn-secondary btn-small" onClick={() => onDetail(hit)}>
            Détail
          </button>
        ) : (
          <span />
        )}
        {onTicket && onRemove ? (
          // Dans le ticket : « − 2 + ». Le « − » retire un exemplaire (le dernier retire la ligne), le « + » s'arrête au stock.
          <div role="group" aria-label={`${name} dans le ticket`} className="flex items-center gap-1">
            <button type="button" className={stepButton} aria-label={`Retirer un ${name} du ticket`} onClick={() => onRemove(hit)}>
              −
            </button>
            <span className="min-w-8 text-center font-display font-bold tabular-nums" aria-live="polite">
              {onTicket.quantity}
            </span>
            <button
              type="button"
              className={stepButton}
              aria-label={`Ajouter un ${name} au ticket`}
              disabled={disabled || onTicket.atLimit}
              onClick={() => onPick(hit)}
            >
              +
            </button>
          </div>
        ) : (
          <button type="button" className={stepButton} aria-label={`Ajouter ${name} au ticket`} disabled={disabled} onClick={() => onPick(hit)}>
            +
          </button>
        )}
      </div>
    </div>
  );
}
