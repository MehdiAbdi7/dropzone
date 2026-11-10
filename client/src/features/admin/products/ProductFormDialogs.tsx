import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import Field from "@/components/ui/Field";
import { KIND_LABELS } from "@/config/catalog";
import type { AdminBrand, DeviceModel } from "@/features/admin/api/catalogApi";
import type { Category, ProductKind } from "@/types/api";
import CompatibleModelsPicker from "./CompatibleModelsPicker";
import ModelPicker from "./ModelPicker";
import type { ProductDraft } from "./productDraft";
import { SectionHeading } from "./FormParts";

// Le contenu des trois fenêtres du formulaire produit. ProductForm garde le brouillon et
// l'ouverture des fenêtres ; ici, chaque partie affiche ses champs et appelle `set` pour les changer.

type SetDraft = (patch: Partial<ProductDraft>) => void;

export function CategoryFields({
  draft,
  categories,
  brands,
  kind,
  isDevice,
  onChooseCategory,
  onChooseModel,
  set,
}: {
  draft: ProductDraft;
  categories: Category[];
  // Les marques de la catégorie choisie.
  brands: AdminBrand[];
  kind: ProductKind | undefined;
  isDevice: boolean;
  onChooseCategory: (id: number) => void;
  onChooseModel: (model: DeviceModel) => void;
  set: SetDraft;
}) {
  return (
    <>
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
              onClick={() => onChooseCategory(item.id)}
            >
              {item.name} <span className="font-normal opacity-75">({KIND_LABELS[item.kind]})</span>
            </button>
          ))}
        </div>
      </fieldset>
      {kind && isDevice ? (
        <section className="space-y-3 rounded-xl border border-line bg-surface p-4 sm:p-5">
          <SectionHeading number="02" title="Modèle de l'appareil" description="Recherche puis sélectionne le modèle concerné." />
          <ModelPicker kind={kind} value={draft.deviceModelId} onChange={onChooseModel} />
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
    </>
  );
}

export function InfoFields({ draft, set }: { draft: ProductDraft; set: SetDraft }) {
  return (
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
  );
}

export function SpecsFields({ draft, set }: { draft: ProductDraft; set: SetDraft }) {
  return (
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
  );
}
