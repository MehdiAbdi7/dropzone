"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { ClipboardCheckIcon, DocumentIcon, GridIcon } from "@/components/ui/icons";
import ProductImage from "@/components/ui/ProductImage";
import { CONDITION_LABELS, SPEC_SUGGESTIONS } from "@/config/catalog";
import { useBrandsQuery, useCategoriesQuery, useMakersQuery, useModelsQuery, type DeviceModel } from "@/features/admin/api/catalogApi";
import { useCreateProductMutation, useGiftOptionsQuery, useUploadImageMutation, useUpdateProductMutation } from "@/features/admin/api/productsApi";
import EditDialog from "./EditDialog";
import { SheetTile } from "./FormParts";
import { CategoryFields, InfoFields, SpecsFields } from "./ProductFormDialogs";
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
} from "./productDraft";
import type { ProductKind } from "@/types/api";
import SaveBar from "./SaveBar";
import VariantEditor from "./VariantEditor";
import VariantList from "./VariantList";

// Le formulaire produit, rempli dans l'ordre où le vendeur pense :
// la catégorie, le modèle, les caractéristiques, puis chaque variante.
// Un état React unique plutôt que React Hook Form : presque tous les champs sont
// des listes à cocher maison, pas des <input> que RHF sait brancher seul.
// La page est légère (23/11) : quatre tuiles (Photos, Catégorie et modèle, Fiche, Caractéristiques) qui ouvrent
// chacune leur fenêtre, puis le neuf scellé et l'occasion dans deux listes séparées.
// Ce fichier garde l'état et l'envoi ; l'affichage est découpé : FormParts (tuiles),
// ProductFormDialogs (champs des fenêtres), VariantList, VariantEditor et SaveBar.
export default function ProductForm({
  productId,
  initial,
  ownSkus = [],
  onSaved,
  photos,
}: {
  productId?: number;
  // Les photos d'un produit existant (la page les gère avec ImageManager) : la tuile et le contenu de sa fenêtre.
  // Sans elles (création), la fenêtre Photos choisit la photo principale envoyée à la création.
  photos?: { count: number; cover: string | null; panel: ReactNode };
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
  const { data: allMakers = [] } = useMakersQuery();
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
  // Les marques du type choisi (accessoires) : Anker dans Chargeurs.
  const makers = allMakers.filter((maker) => maker.typeId === draft.brandId);
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
      makerId: id === draft.categoryId ? draft.makerId : null,
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

  // Les noms lisibles du résumé : la catégorie, le modèle et la marque choisis.
  const modelName = models.find((model) => model.id === draft.deviceModelId)?.name ?? null;
  const brandName = brands.find((brand) => brand.id === draft.brandId)?.name ?? null;
  const makerName = makers.find((maker) => maker.id === draft.makerId)?.name ?? null;
  const filledSpecs = draft.specs.filter((row) => row.key.trim() && row.value.trim());
  const openVariant = typeof open === "string" && open.startsWith("variant:") ? open.slice("variant:".length) : null;
  const editedVariant = draft.variants.find((variant) => variant.key === openVariant);
  const editedIndex = draft.variants.findIndex((variant) => variant.key === openVariant);
  // Le numéro dans sa propre liste (Neuf scellé ou Occasion) : « Occasion n° 2 », pas « Variante 7 ».
  const groupIndex = editedVariant
    ? draft.variants.filter((variant) => variant.condition === editedVariant.condition).findIndex((variant) => variant.key === editedVariant.key)
    : -1;

  function addVariant(condition: "new" | "refurbished") {
    const variant = emptyVariant(condition, kind);
    set({ variants: [...draft.variants, variant] });
    setOpen(`variant:${variant.key}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SheetTile
          title="Photos"
          status={
            photos
              ? photos.count > 0
                ? `${photos.count} photo${photos.count > 1 ? "s" : ""}`
                : "Aucune photo"
              : (coverPhoto?.name ?? "Photo principale à choisir")
          }
          state={(photos ? photos.count > 0 : coverPhoto) ? "done" : "todo"}
          preview={photos?.cover ? <ProductImage src={photos.cover} alt="" sizes="48px" /> : <GridIcon size={20} />}
          onClick={() => setOpen("photos")}
        />
        <SheetTile
          title="Catégorie et modèle"
          status={category ? [category.name, isDevice ? (modelName ?? "modèle à choisir") : (brandName ?? makerName)].filter(Boolean).join(" · ") : "À choisir"}
          state={category && (!isDevice || modelName) ? "done" : "todo"}
          preview={<ClipboardCheckIcon size={20} />}
          onClick={() => setOpen("category")}
        />
        {kind ? (
          <>
            <SheetTile
              title="Fiche du produit"
              status={draft.name.trim() ? (draft.description.trim() ? draft.name : `${draft.name} · description à écrire`) : "Nom à écrire"}
              state={draft.name.trim() && draft.description.trim() ? "done" : "todo"}
              preview={<DocumentIcon size={20} />}
              onClick={() => setOpen("info")}
            />
            <SheetTile
              title="Caractéristiques"
              status={filledSpecs.length > 0 ? `${filledSpecs.length} renseignée${filledSpecs.length > 1 ? "s" : ""}` : "Facultatif"}
              state={filledSpecs.length > 0 ? "done" : "optional"}
              preview={<GridIcon size={20} />}
              onClick={() => setOpen("specs")}
            />
          </>
        ) : null}
      </div>
      {!kind ? <p className="text-sm text-ink-muted">Choisis d&apos;abord une catégorie : elle décide du reste de la fiche.</p> : null}

      {kind ? (
        <VariantList
          variants={draft.variants}
          canAddRefurbished={isDevice}
          onAdd={addVariant}
          onEdit={(key) => setOpen(`variant:${key}`)}
        />
      ) : null}

      <EditDialog open={open === "photos"} title="Photos du produit" onClose={() => setOpen(null)}>
        {photos ? (
          photos.panel
        ) : (
          <label className="block rounded-lg border border-dashed border-line bg-surface p-4">
            <span className="label">Photo principale (JPEG, PNG ou WebP, 5 Mo maximum)</span>
            <span className="mb-2 block text-sm text-ink-muted">Elle sera envoyée à la création. Les autres photos s&apos;ajoutent ensuite.</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-2 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue file:px-3 file:py-2 file:font-semibold file:text-on-brand"
              onChange={(event) => setCoverPhoto(event.target.files?.[0] ?? null)}
            />
            {coverPhoto ? <span className="mt-2 block truncate text-sm font-semibold">{coverPhoto.name}</span> : null}
          </label>
        )}
      </EditDialog>

      <EditDialog open={open === "category"} title="Catégorie et modèle" onClose={() => setOpen(null)}>
        <CategoryFields
          draft={draft}
          categories={categories}
          brands={brands}
          makers={makers}
          kind={kind}
          isDevice={isDevice}
          onChooseCategory={chooseCategory}
          onChooseModel={chooseModel}
          set={set}
        />
      </EditDialog>

      <EditDialog open={open === "info"} title="Fiche du produit" onClose={() => setOpen(null)}>
        <InfoFields draft={draft} set={set} />
      </EditDialog>

      <EditDialog open={open === "specs"} title="Caractéristiques du modèle" onClose={() => setOpen(null)}>
        <SpecsFields draft={draft} set={set} />
      </EditDialog>

      <EditDialog
        open={Boolean(editedVariant)}
        title={editedVariant ? `${CONDITION_LABELS[editedVariant.condition]} n° ${groupIndex + 1}` : "Variante"}
        onClose={() => setOpen(null)}
      >
        {editedVariant && kind ? (
          <VariantEditor
            variant={editedVariant}
            index={groupIndex}
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

      <SaveBar
        missingOrigins={missingOrigins}
        missingBoxes={missingBoxes}
        badWarranties={badWarranties}
        error={error}
        status={draft.status}
        onStatusChange={(status) => set({ status })}
        isLoading={isLoading}
        canSubmit={Boolean(kind)}
        submitLabel={productId ? "Enregistrer les modifications" : "Créer le produit"}
      />
    </form>
  );
}
