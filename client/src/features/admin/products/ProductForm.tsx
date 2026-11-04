"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import BrandLogo from "@/components/ui/BrandLogo";
import Field from "@/components/ui/Field";
import { KIND_LABELS, SPEC_SUGGESTIONS } from "@/config/catalog";
import { errorMessage, fieldErrors } from "@/lib/errors";
import {
  useBrandsQuery,
  useCategoriesQuery,
  useCreateProductMutation,
  useGiftOptionsQuery,
  useUpdateProductMutation,
  type DeviceModel,
} from "../adminApi";
import CompatibleModelsPicker from "./CompatibleModelsPicker";
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

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <section aria-labelledby="step-category" className="card space-y-4 p-5">
        <h2 id="step-category" className="text-xl">
          Catégorie
        </h2>
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
      </section>

      {kind ? (
        <>
          {isDevice ? (
            <section aria-labelledby="step-model" className="card space-y-4 p-5">
              <h2 id="step-model" className="text-xl">
                Modèle de l&apos;appareil
              </h2>
              <ModelPicker kind={kind} value={draft.deviceModelId} onChange={chooseModel} />
            </section>
          ) : null}

          {kind === "accessory" ? (
            <section aria-labelledby="step-compatible" className="card space-y-4 p-5">
              <h2 id="step-compatible" className="text-xl">
                Modèles compatibles
              </h2>
              <p className="text-sm text-ink-muted">Pour une coque ou un verre trempé. Laissez vide pour un chargeur universel.</p>
              <CompatibleModelsPicker
                value={draft.compatibleModelIds}
                onChange={(ids) => set({ compatibleModelIds: ids })}
              />
            </section>
          ) : null}

          <section aria-labelledby="step-brand" className="card space-y-4 p-5">
            <h2 id="step-brand" className="text-xl">
              Marque
            </h2>
            {brands.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="chip"
                  aria-pressed={draft.brandId === null}
                  onClick={() => set({ brandId: null })}
                >
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
          </section>

          <section aria-labelledby="step-info" className="card space-y-4 p-5">
            <h2 id="step-info" className="text-xl">
              Fiche du produit
            </h2>
            <Field id="name" label="Nom affiché">
              <input id="name" className="input" value={draft.name} onChange={(event) => set({ name: event.target.value })} />
            </Field>
            <Field id="description" label="Description">
              <textarea
                id="description"
                className="input min-h-24"
                rows={4}
                value={draft.description}
                onChange={(event) => set({ description: event.target.value })}
              />
            </Field>
            <fieldset className="space-y-2">
              <legend className="label">Caractéristiques du modèle</legend>
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
          </section>

          <section id="variantes" aria-labelledby="step-variants" className="scroll-mt-6 space-y-4">
            <h2 id="step-variants" className="text-xl">
              Variantes ({draft.variants.length})
            </h2>
            {draft.variants.map((variant, index) => (
              <VariantEditor
                key={variant.key}
                variant={variant}
                index={index}
                kind={kind}
                canBeRefurbished={isDevice}
                giftOptions={giftOptions}
                onChange={(next) => set({ variants: draft.variants.map((v) => (v.key === variant.key ? next : v)) })}
                onRemove={() => set({ variants: draft.variants.filter((v) => v.key !== variant.key) })}
                onSuggestSku={() =>
                  set({
                    variants: draft.variants.map((v) =>
                      v.key === variant.key ? { ...v, sku: suggestSku(draft.name, v, index) } : v,
                    ),
                  })
                }
              />
            ))}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => set({ variants: [...draft.variants, emptyVariant("new", kind)] })}
              >
                Ajouter une variante neuve
              </button>
              {isDevice ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => set({ variants: [...draft.variants, emptyVariant("refurbished", kind)] })}
                >
                  Ajouter une affaire
                </button>
              ) : null}
            </div>
          </section>
        </>
      ) : (
        <p className="text-ink-muted">Choisissez d&apos;abord une catégorie : elle décide du reste du formulaire.</p>
      )}

      <div className="card sticky bottom-0 z-10 flex flex-wrap items-center gap-4 p-4">
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
