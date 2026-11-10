"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import BrandLogo from "@/components/ui/BrandLogo";
import Field from "@/components/ui/Field";
import { CONDITION_LABELS, KIND_LABELS, SPEC_SUGGESTIONS } from "@/config/catalog";
import { formatPrice } from "@/lib/format";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { useBrandsQuery, useCategoriesQuery, useModelsQuery, type DeviceModel } from "@/features/admin/api/catalogApi";
import { useCreateProductMutation, useGiftOptionsQuery, useUploadImageMutation, useUpdateProductMutation } from "@/features/admin/api/productsApi";
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
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const { data: categories = [] } = useCategoriesQuery();
  const { data: allBrands = [] } = useBrandsQuery();
  const { data: giftOptionsAll = [] } = useGiftOptionsQuery();
  const { data: models = [] } = useModelsQuery();
  // La fenêtre ouverte : une partie de la fiche, ou une variante ("variant:<clé>").
  const [open, setOpen] = useState<string | null>(initial.categoryId ? null : "category");
  const [createProduct, createState] = useCreateProductMutation();
  const [uploadImage, uploadState] = useUploadImageMutation();
  const [updateProduct, updateState] = useUpdateProductMutation();
  const { error } = productId ? updateState : createState;
  const isLoading = productId ? updateState.isLoading : createState.isLoading || uploadState.isLoading;

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
        if (coverPhoto) {
          try {
            await uploadImage({ id: created.id, file: coverPhoto }).unwrap();
          } catch {
            router.push(`/admin/produits/${created.id}?cree=1&photoErreur=1`);
            return;
          }
        }
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
      {!productId ? (
        <section className="space-y-4 rounded-xl border border-blue-ink/40 bg-blue-soft/40 p-4 sm:p-5">
          <SectionHeading
            number="01"
            title="Photo du produit"
            description="Choisis la photo principale maintenant. Elle sera envoyée à la création."
          />
          <label className="block rounded-lg border border-dashed border-line bg-surface p-4">
            <span className="label">Photo principale (JPEG, PNG ou WebP, 5 Mo maximum)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-2 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue file:px-3 file:py-2 file:font-semibold file:text-on-brand"
              onChange={(event) => setCoverPhoto(event.target.files?.[0] ?? null)}
            />
            {coverPhoto ? <span className="mt-2 block truncate text-sm font-semibold">{coverPhoto.name}</span> : null}
          </label>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <SummaryCard
          step="02"
          title="Catégorie et modèle"
          description="Définit les champs et les options disponibles."
          status={category && (!isDevice || modelName) ? "Complété" : "À compléter"}
          complete={Boolean(category && (!isDevice || modelName))}
          action={kind ? "Modifier" : "Choisir"}
          onEdit={() => setOpen("category")}
          className="lg:col-span-2"
        >
          {category ? (
            <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <SummaryLine label="Catégorie" value={`${category.name} (${KIND_LABELS[category.kind]})`} />
              {isDevice ? <SummaryLine label="Modèle" value={modelName ?? "À choisir"} missing={!modelName} /> : null}
              {kind === "accessory" ? (
                <SummaryLine label="Compatible avec" value={`${draft.compatibleModelIds.length} modèle(s)`} />
              ) : null}
              {kind === "accessory" ? (
                <SummaryLine label="Type" value={brandName ?? "Sans type"} />
              ) : (
                <SummaryLine label="Marque" value={brandName ?? "Sans marque"} />
              )}
            </dl>
          ) : (
            <p className="text-sm text-ink-muted">Choisis d&apos;abord une catégorie : elle décide du reste de la fiche.</p>
          )}
        </SummaryCard>

        {kind ? (
          <>
            <SummaryCard
              step="03"
              title="Fiche du produit"
              description="Le nom et le texte visibles dans la boutique."
              status={draft.name.trim() && draft.description.trim() ? "Complété" : "À compléter"}
              complete={Boolean(draft.name.trim() && draft.description.trim())}
              action="Modifier"
              onEdit={() => setOpen("info")}
            >
              <p className="font-semibold">{draft.name || <span className="text-red">Nom à écrire</span>}</p>
              <p className="line-clamp-3 text-sm text-ink-muted">{draft.description || "Pas encore de description."}</p>
            </SummaryCard>

            <SummaryCard
              step="04"
              title="Caractéristiques"
              description="Les informations techniques du modèle."
              status={filledSpecs.length > 0 ? `${filledSpecs.length} renseignée${filledSpecs.length > 1 ? "s" : ""}` : "Facultatif"}
              complete={filledSpecs.length > 0}
              action="Modifier"
              onEdit={() => setOpen("specs")}
            >
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
            <div>
              <p className="text-xs font-bold tracking-wider text-blue-ink">ÉTAPE 05</p>
              <h2 id="step-variants" className="text-xl">Stock et variantes ({draft.variants.length})</h2>
              <p className="mt-1 text-sm text-ink-muted">Chaque combinaison de modèle, couleur ou stockage a son prix et son stock.</p>
            </div>
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
            <ul className="grid gap-3 md:grid-cols-2">
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
                  <li key={variant.key} className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface-2/40 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span
                          className={`badge ${variant.condition === "refurbished" ? "bg-red-soft text-red" : "bg-blue-soft text-blue-ink"}`}
                        >
                          {CONDITION_LABELS[variant.condition]}
                        </span>
                        <p className="mt-2 truncate font-semibold">{options || "Options à choisir"}</p>
                        <p className="mt-0.5 truncate text-xs text-ink-muted">
                          {variant.sku || "SKU à écrire"}
                          {variant.reference ? ` · Réf. ${variant.reference}` : ""}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold">{variant.price ? formatPrice(Number(variant.price)) : "Prix à saisir"}</p>
                        <p className="text-ink-muted">Stock : {variant.stock || 0}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                      {problems.length > 0 ? (
                        <span className="badge bg-[#ffb547] text-black">À compléter : {problems.join(", ")}</span>
                      ) : (
                        <span className="text-xs font-semibold text-ink-muted">Variante prête</span>
                      )}
                      <button
                        type="button"
                        className="btn btn-secondary btn-small ml-auto"
                        onClick={() => setOpen(`variant:${variant.key}`)}
                      >
                        Modifier la variante
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      <EditDialog open={open === "category"} title="Catégorie et modèle" onClose={() => setOpen(null)}>
        <fieldset className="space-y-3 rounded-xl border border-line bg-surface p-4 sm:p-5">
          <legend className="sr-only">Catégorie</legend>
          <SectionHeading number="01" title="Catégorie" description="Choisis la famille de produits." />
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
          <section className="space-y-3 rounded-xl border border-line bg-surface p-4 sm:p-5">
            <SectionHeading number="02" title="Modèle de l'appareil" description="Recherche puis sélectionne le modèle concerné." />
            <ModelPicker kind={kind} value={draft.deviceModelId} onChange={chooseModel} />
          </section>
        ) : null}
        {kind === "accessory" ? (
          <section className="space-y-3 rounded-xl border border-line bg-surface p-4 sm:p-5">
            <SectionHeading number="02" title="Compatibilité" description="Laisse vide pour un accessoire universel." />
            <CompatibleModelsPicker value={draft.compatibleModelIds} onChange={(ids) => set({ compatibleModelIds: ids })} />
          </section>
        ) : null}
        {kind ? (
          <fieldset className="space-y-3 rounded-xl border border-line bg-surface p-4 sm:p-5">
            {/* Pour un accessoire, la « marque » est son type (Coques, Chargeurs…, 06/11). */}
            <legend className="sr-only">{kind === "accessory" ? "Type d'accessoire" : "Marque"}</legend>
            <SectionHeading
              number="03"
              title={kind === "accessory" ? "Type d'accessoire" : "Marque"}
              description="Associe le produit à une marque du catalogue."
            />
            {brands.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" className="chip" aria-pressed={draft.brandId === null} onClick={() => set({ brandId: null })}>
                  {kind === "accessory" ? "Sans type" : "Sans marque"}
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
                {kind === "accessory" ? "Aucun type dans cette catégorie." : "Aucune marque dans cette catégorie."}{" "}
                <Link
                  href={draft.categoryId ? `/admin/catalogue/${draft.categoryId}#marques` : "/admin/catalogue"}
                  className="font-semibold text-blue-ink underline"
                >
                  En ajouter dans le Catalogue
                </Link>
              </p>
            )}
          </fieldset>
        ) : null}
      </EditDialog>

      <EditDialog open={open === "info"} title="Fiche du produit" onClose={() => setOpen(null)}>
        <section className="space-y-4 rounded-xl border border-line bg-surface p-4 sm:p-5">
          <SectionHeading number="01" title="Présentation" description="Ce nom et cette description apparaîtront sur la boutique." />
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
        </section>
      </EditDialog>

      <EditDialog open={open === "specs"} title="Caractéristiques du modèle" onClose={() => setOpen(null)}>
        <fieldset className="space-y-3 rounded-xl border border-line bg-surface p-4 sm:p-5">
          <legend className="sr-only">Caractéristiques du modèle</legend>
          <SectionHeading number="01" title="Caractéristiques techniques" description="Ajoute une ligne par caractéristique et sa valeur." />
          {draft.specs.map((row, index) => (
            <div key={index} className="grid gap-2 rounded-lg border border-line bg-surface-2/50 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
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

      <div className="card sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 space-y-3 p-4 lg:bottom-0">
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">Statut du produit</legend>
            <span className="mr-1 text-sm font-semibold">Statut :</span>
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
        </div>
      </div>
    </form>
  );
}

function SectionHeading({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-line pb-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-soft text-xs font-bold text-blue-ink">
        {number}
      </span>
      <div>
        <h3 className="font-display font-bold">{title}</h3>
        <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
      </div>
    </div>
  );
}

function SummaryCard({
  step,
  title,
  description,
  status,
  complete,
  action,
  onEdit,
  className = "",
  children,
}: {
  step: string;
  title: string;
  description: string;
  status: string;
  complete: boolean;
  action: string;
  onEdit: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`card flex flex-col gap-3 p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-soft text-xs font-bold text-blue-ink">{step}</span>
          <div className="min-w-0">
            <h2 className="text-lg">{title}</h2>
            <p className="text-sm text-ink-muted">{description}</p>
          </div>
        </div>
        <button type="button" className="btn btn-secondary btn-small" onClick={onEdit}>
          {action}
        </button>
      </div>
      <div className="flex items-center gap-2 border-t border-line pt-3">
        <span
          className={`size-2 rounded-full ${status === "Facultatif" ? "bg-line" : complete ? "bg-blue" : "bg-amber"}`}
          aria-hidden="true"
        />
        <span className="text-xs font-semibold text-ink-muted">{status}</span>
      </div>
      <div className="min-w-0">{children}</div>
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
