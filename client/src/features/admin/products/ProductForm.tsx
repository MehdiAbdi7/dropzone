"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import BrandLogo from "@/components/ui/BrandLogo";
import Field from "@/components/ui/Field";
import { CONDITION_LABELS, KIND_LABELS, SPEC_SUGGESTIONS } from "@/config/catalog";
import { formatPrice } from "@/lib/format";
import { errorMessage, fieldErrors } from "@/lib/errors";
import {
  useBrandsQuery,
  useCategoriesQuery,
  useCreateProductMutation,
  useGiftOptionsQuery,
  useModelsQuery,
  useUpdateProductMutation,
  type DeviceModel,
} from "../adminApi";
import CompatibleModelsPicker from "./CompatibleModelsPicker";
import EditDialog from "./EditDialog";
import ModelPicker from "./ModelPicker";
import {
  bodyFromDraft,
  emptyVariant,
  fillMissingWarranties,
  invalidWarranty,
  isDeviceKind,
  missingBox,
  missingPartOrigins,
  suggestSku,
  type ProductDraft,
  WARRANTY_MAX,
} from "./productDraft";
import type { ProductKind } from "@/types/api";
import VariantEditor from "./VariantEditor";

// Le formulaire produit, rempli dans l'ordre où le vendeur pense :
// la catégorie, le modèle, les caractéristiques, puis chaque variante.
// Un état React unique plutôt que React Hook Form : presque tous les champs sont
// des listes à cocher maison, pas des <input> que RHF sait brancher seul.
export default function ProductForm({
  productId,
  initial,
  ownSkus = [],
  onSaved,
}: {
  productId?: number;
  initial: ProductDraft;
  ownSkus?: string[];
  // Après une modification, la page relit le produit et recrée le formulaire
  // (les nouvelles variantes ont alors leur id) : le message vit dans la page.
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [missingOrigins, setMissingOrigins] = useState<string[]>([]);
  // Les SKU des affaires importées dont la boîte n'est pas encore choisie.
  const [missingBoxes, setMissingBoxes] = useState<string[]>([]);
  // Les SKU des variantes dont la garantie sort de 1 à 36 mois.
  const [badWarranties, setBadWarranties] = useState<string[]>([]);
  const { data: categories = [] } = useCategoriesQuery();
  const { data: allBrands = [] } = useBrandsQuery();
  const { data: giftOptionsAll = [] } = useGiftOptionsQuery();
  const { data: models = [] } = useModelsQuery();
  // La fenêtre ouverte : une partie de la fiche, ou une variante ("variant:<clé>").
  const [open, setOpen] = useState<string | null>(initial.categoryId ? null : "category");
  const [createProduct, createState] = useCreateProductMutation();
  const [updateProduct, updateState] = useUpdateProductMutation();
  const { error, isLoading } = productId ? updateState : createState;

  const category = categories.find((item) => item.id === draft.categoryId);
  const kind = category?.kind;
  const isDevice = isDeviceKind(kind);
  const brands = allBrands.filter((brand) => brand.categoryId === draft.categoryId);
  // Un produit ne s'offre pas lui-même.
  const giftOptions = giftOptionsAll.filter((option) => !ownSkus.includes(option.sku));

  const set = (patch: Partial<ProductDraft>) => setDraft((current) => ({ ...current, ...patch }));

  // Dès que la sorte de la catégorie est connue (un clic sur une catégorie, ou une fiche
  // préremplie depuis le Catalogue une fois les catégories chargées), les garanties encore
  // vides reçoivent celle de DropZone. Un ajustement pendant le rendu, sans useEffect.
  const [warrantyKind, setWarrantyKind] = useState<ProductKind | undefined>(undefined);
  if (kind !== warrantyKind) {
    setWarrantyKind(kind);
    if (kind) {
      setDraft((current) => fillMissingWarranties(current, kind));
    }
  }

  function chooseCategory(id: number) {
    const next = categories.find((item) => item.id === id);
    const device = isDeviceKind(next?.kind);
    set({
      categoryId: id,
      deviceModelId: device ? draft.deviceModelId : null,
      // Les marques sont rangées par catégorie : en changer vide la marque.
      brandId: id === draft.categoryId ? draft.brandId : null,
      compatibleModelIds: next?.kind === "accessory" ? draft.compatibleModelIds : [],
      // Les caractéristiques habituelles de cette sorte, à compléter.
      specs:
        draft.specs.length > 0 || !next
          ? draft.specs
          : SPEC_SUGGESTIONS[next.kind].map((key) => ({ key, value: "" })),
      // La garantie suit au rendu suivant (fillMissingWarranties, plus haut).
      variants: device ? draft.variants : draft.variants.map((variant) => ({ ...variant, condition: "new" as const })),
    });
  }

  // Choisir « Galaxy S24 Ultra » choisit la marque dont le fabricant est « Samsung ».
  function chooseModel(model: DeviceModel) {
    const maker = brands.find((brand) => brand.makerName === model.brand);
    set({ deviceModelId: model.id, name: draft.name || model.name, brandId: maker?.id ?? draft.brandId });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    // Rien ne part tant qu'une pièce changée n'a pas son origine : pas de valeur par défaut.
    const missing = [...new Set(draft.variants.flatMap((variant) => missingPartOrigins(variant)))];
    // Ni une affaire importée dont la boîte n'est pas choisie (« Non précisée, à corriger »).
    const boxes = draft.variants.filter(missingBox).map((variant) => variant.sku);
    // Ni une garantie hors de 1 à 36 mois, que l'API refuserait.
    const warranties = draft.variants.filter(invalidWarranty).map((variant) => variant.sku);
    setMissingOrigins(missing);
    setMissingBoxes(boxes);
    setBadWarranties(warranties);
    if (missing.length > 0 || boxes.length > 0 || warranties.length > 0) {
      return;
    }
    const body = bodyFromDraft(draft);
    try {
      if (productId) {
        await updateProduct({ id: productId, body }).unwrap();
        onSaved?.();
      } else {
        const created = await createProduct(body).unwrap();
        router.push(`/admin/produits/${created.id}?cree=1`);
      }
    } catch {
      // Les erreurs s'affichent au-dessus du bouton.
    }
  }

  const serverErrors = Object.entries(fieldErrors(error));

  // Les noms lisibles du résumé : la catégorie, le modèle et la marque choisis.
  const modelName = models.find((model) => model.id === draft.deviceModelId)?.name ?? null;
  const brandName = brands.find((brand) => brand.id === draft.brandId)?.name ?? null;
  const filledSpecs = draft.specs.filter((row) => row.key.trim() && row.value.trim());
  const openVariant = typeof open === "string" && open.startsWith("variant:") ? open.slice("variant:".length) : null;
  const editedVariant = draft.variants.find((variant) => variant.key === openVariant);
  const editedIndex = draft.variants.findIndex((variant) => variant.key === openVariant);

  function addVariant(condition: "new" | "refurbished") {
    const variant = emptyVariant(condition, kind);
    set({ variants: [...draft.variants, variant] });
    setOpen(`variant:${variant.key}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {/* Une seule page : le résumé de chaque partie, et une fenêtre au centre pour la
          modifier (refonte du 05/11, demande de Mehdi : la page était trop longue). */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SummaryCard
          title="Catégorie et modèle"
          action={kind ? "Modifier" : "Choisir"}
          onEdit={() => setOpen("category")}
        >
          {category ? (
            <dl className="space-y-1 text-sm">
              <SummaryLine label="Catégorie" value={`${category.name} (${KIND_LABELS[category.kind]})`} />
              {isDevice ? <SummaryLine label="Modèle" value={modelName ?? "À choisir"} missing={!modelName} /> : null}
              {kind === "accessory" ? (
                <SummaryLine label="Compatible avec" value={`${draft.compatibleModelIds.length} modèle(s)`} />
              ) : null}
              <SummaryLine label="Marque" value={brandName ?? "Sans marque"} />
            </dl>
          ) : (
            <p className="text-sm text-ink-muted">Choisis d&apos;abord une catégorie : elle décide du reste de la fiche.</p>
          )}
        </SummaryCard>

        {kind ? (
          <>
            <SummaryCard title="Fiche du produit" action="Modifier" onEdit={() => setOpen("info")}>
              <p className="font-semibold">{draft.name || <span className="text-red">Nom à écrire</span>}</p>
              <p className="line-clamp-3 text-sm text-ink-muted">{draft.description || "Pas encore de description."}</p>
            </SummaryCard>

            <SummaryCard title={`Caractéristiques (${filledSpecs.length})`} action="Modifier" onEdit={() => setOpen("specs")}>
              {filledSpecs.length > 0 ? (
                <dl className="space-y-1 text-sm">
                  {filledSpecs.slice(0, 4).map((row) => (
                    <SummaryLine key={row.key} label={row.key} value={row.value} />
                  ))}
                  {filledSpecs.length > 4 ? <p className="text-ink-muted">et {filledSpecs.length - 4} de plus</p> : null}
                </dl>
              ) : (
                <p className="text-sm text-ink-muted">Aucune caractéristique remplie.</p>
              )}
            </SummaryCard>
          </>
        ) : null}
      </div>

      {kind ? (
        <section id="variantes" aria-labelledby="step-variants" className="card scroll-mt-6 space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="step-variants" className="text-xl">
              Variantes ({draft.variants.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-secondary btn-small" onClick={() => addVariant("new")}>
                + Neuf scellé
              </button>
              {isDevice ? (
                <button type="button" className="btn btn-secondary btn-small" onClick={() => addVariant("refurbished")}>
                  + Affaire
                </button>
              ) : null}
            </div>
          </div>
          {draft.variants.length === 0 ? (
            <p className="text-sm text-ink-muted">Aucune variante : ajoute un neuf scellé ou une affaire.</p>
          ) : (
            <ul className="divide-y divide-line">
              {draft.variants.map((variant) => {
                const options = Object.values(variant.options).filter(Boolean).join(" · ");
                // Ce qui bloquera l'envoi, signalé sur la ligne avant même d'enregistrer.
                const problems = [
                  missingBox(variant) ? "boîte à choisir" : null,
                  missingPartOrigins(variant).length > 0 ? "origine des pièces" : null,
                  invalidWarranty(variant) ? "garantie" : null,
                  !variant.price ? "prix" : null,
                ].filter(Boolean);
                return (
                  <li key={variant.key} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                    <span
                      className={`badge ${variant.condition === "refurbished" ? "bg-red-soft text-red" : "bg-blue-soft text-blue-ink"}`}
                    >
                      {CONDITION_LABELS[variant.condition]}
                    </span>
                    <span className="min-w-0 flex-1 basis-48">
                      <span className="font-semibold">{options || "Sans option"}</span>
                      <span className="block text-xs text-ink-muted">
                        {variant.sku || "SKU à écrire"}
                        {variant.reference ? ` · Réf. ${variant.reference}` : ""}
                      </span>
                    </span>
                    <span className="text-sm whitespace-nowrap">
                      {variant.price ? formatPrice(Number(variant.price)) : "—"} · stock {variant.stock || 0}
                    </span>
                    {problems.length > 0 ? (
                      <span className="badge bg-[#ffb547] text-black">À compléter : {problems.join(", ")}</span>
                    ) : null}
                    {/* ml-auto : « Modifier » reste à droite, même quand la ligne passe à la ligne. */}
                    <button
                      type="button"
                      className="btn btn-secondary btn-small ml-auto"
                      onClick={() => setOpen(`variant:${variant.key}`)}
                    >
                      Modifier
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      <EditDialog open={open === "category"} title="Catégorie et modèle" onClose={() => setOpen(null)}>
        <fieldset className="space-y-2">
          <legend className="label">Catégorie</legend>
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                className="chip"
                aria-pressed={item.id === draft.categoryId}
                onClick={() => chooseCategory(item.id)}
              >
                {item.name} <span className="font-normal opacity-75">({KIND_LABELS[item.kind]})</span>
              </button>
            ))}
          </div>
        </fieldset>
        {kind && isDevice ? (
          <div className="space-y-2">
            <p className="label">Modèle de l&apos;appareil</p>
            <ModelPicker kind={kind} value={draft.deviceModelId} onChange={chooseModel} />
          </div>
        ) : null}
        {kind === "accessory" ? (
          <div className="space-y-2">
            <p className="label">Modèles compatibles</p>
            <p className="text-sm text-ink-muted">Pour une coque ou un verre trempé. Laisse vide pour un chargeur universel.</p>
            <CompatibleModelsPicker value={draft.compatibleModelIds} onChange={(ids) => set({ compatibleModelIds: ids })} />
          </div>
        ) : null}
        {kind ? (
          <fieldset className="space-y-2">
            <legend className="label">Marque</legend>
            {brands.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" className="chip" aria-pressed={draft.brandId === null} onClick={() => set({ brandId: null })}>
                  Sans marque
                </button>
                {brands.map((brand) => (
                  <button
                    key={brand.id}
                    type="button"
                    className="chip"
                    aria-pressed={draft.brandId === brand.id}
                    onClick={() => set({ brandId: brand.id })}
                  >
                    <BrandLogo url={brand.logoUrl} />
                    {brand.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">
                Aucune marque dans cette catégorie.{" "}
                <Link href="/admin/categories" className="font-semibold text-blue-ink underline">
                  En ajouter dans Catégories
                </Link>
              </p>
            )}
          </fieldset>
        ) : null}
      </EditDialog>

      <EditDialog open={open === "info"} title="Fiche du produit" onClose={() => setOpen(null)}>
        <Field id="name" label="Nom affiché">
          <input id="name" className="input" value={draft.name} onChange={(event) => set({ name: event.target.value })} />
        </Field>
        <Field id="description" label="Description">
          <textarea
            id="description"
            className="input min-h-24"
            rows={5}
            value={draft.description}
            onChange={(event) => set({ description: event.target.value })}
          />
        </Field>
      </EditDialog>

      <EditDialog open={open === "specs"} title="Caractéristiques du modèle" onClose={() => setOpen(null)}>
        <fieldset className="space-y-2">
          <legend className="sr-only">Caractéristiques du modèle</legend>
          {draft.specs.map((row, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
              <input
                aria-label={`Caractéristique ${index + 1}`}
                className="input"
                placeholder="Écran"
                value={row.key}
                onChange={(event) =>
                  set({ specs: draft.specs.map((r, i) => (i === index ? { ...r, key: event.target.value } : r)) })
                }
              />
              <input
                aria-label={`Valeur de ${row.key || `la caractéristique ${index + 1}`}`}
                className="input"
                placeholder="6,7 pouces OLED, 120 Hz"
                value={row.value}
                onChange={(event) =>
                  set({ specs: draft.specs.map((r, i) => (i === index ? { ...r, value: event.target.value } : r)) })
                }
              />
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => set({ specs: draft.specs.filter((_, i) => i !== index) })}
              >
                Retirer
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-sm font-semibold text-blue-ink underline"
            onClick={() => set({ specs: [...draft.specs, { key: "", value: "" }] })}
          >
            Ajouter une caractéristique
          </button>
        </fieldset>
      </EditDialog>

      <EditDialog
        open={Boolean(editedVariant)}
        title={editedVariant ? `Variante ${editedIndex + 1} · ${CONDITION_LABELS[editedVariant.condition]}` : "Variante"}
        onClose={() => setOpen(null)}
      >
        {editedVariant && kind ? (
          <VariantEditor
            variant={editedVariant}
            index={editedIndex}
            kind={kind}
            canBeRefurbished={isDevice}
            giftOptions={giftOptions}
            modelColors={models.find((model) => model.id === draft.deviceModelId)?.colors ?? []}
            modelId={isDevice ? draft.deviceModelId : null}
            onChange={(next) => set({ variants: draft.variants.map((v) => (v.key === editedVariant.key ? next : v)) })}
            onRemove={() => {
              set({ variants: draft.variants.filter((v) => v.key !== editedVariant.key) });
              setOpen(null);
            }}
            onSuggestSku={() =>
              set({
                variants: draft.variants.map((v) =>
                  v.key === editedVariant.key ? { ...v, sku: suggestSku(draft.name, v, editedIndex) } : v,
                ),
              })
            }
          />
        ) : null}
      </EditDialog>

      <div className="card sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center gap-4 p-4 lg:bottom-0">
        <fieldset className="flex gap-2">
          <legend className="sr-only">Statut</legend>
          {(["draft", "published"] as const).map((status) => (
            <button
              key={status}
              type="button"
              className="chip"
              aria-pressed={draft.status === status}
              onClick={() => set({ status })}
            >
              {status === "draft" ? "Brouillon" : "Publié"}
            </button>
          ))}
        </fieldset>
        <button type="submit" className="btn btn-primary" disabled={isLoading || !kind}>
          {isLoading ? "Enregistrement…" : productId ? "Enregistrer les modifications" : "Créer le produit"}
        </button>
        <div aria-live="polite" className="text-sm">
          {missingOrigins.length > 0 || missingBoxes.length > 0 || badWarranties.length > 0 ? (
            <>
              {missingOrigins.length > 0 ? (
                <p className="font-semibold text-red">
                  Dites si chaque pièce changée est d&apos;origine ou compatible : {missingOrigins.join(", ")}.
                </p>
              ) : null}
              {missingBoxes.length > 0 ? (
                <p className="font-semibold text-red">Choisissez la boîte de : {missingBoxes.join(", ")}.</p>
              ) : null}
              {badWarranties.length > 0 ? (
                <p className="font-semibold text-red">
                  La garantie va de 1 à {WARRANTY_MAX} mois : {badWarranties.join(", ")}.
                </p>
              ) : null}
            </>
          ) : error ? (
            <div className="text-red">
              <p className="font-semibold">{errorMessage(error)}</p>
              {serverErrors.length > 0 ? (
                <ul className="list-disc pl-5">
                  {serverErrors.map(([field, messages]) => (
                    <li key={field}>
                      {field} : {messages.join(", ")}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </form>
  );
}

// Une partie de la fiche, résumée, avec le bouton qui ouvre sa fenêtre.
function SummaryCard({ title, action, onEdit, children }: { title: string; action: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg">{title}</h2>
        <button type="button" className="btn btn-secondary btn-small" onClick={onEdit}>
          {action}
        </button>
      </div>
      {children}
    </section>
  );
}

function SummaryLine({ label, value, missing = false }: { label: string; value: string; missing?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-ink-muted">{label} :</dt>
      <dd className={`min-w-0 truncate font-semibold ${missing ? "text-red" : ""}`}>{value}</dd>
    </div>
  );
}
