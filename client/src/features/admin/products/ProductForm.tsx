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
import SaveBar, { WindowFooter } from "./SaveBar";
import VariantStatusPicker from "./VariantStatusPicker";
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
  // Un produit existant s'enregistre fenêtre par fenêtre (23/11) : `saved` est ce que l'API a reçu. Fermer une
  // fenêtre sans enregistrer y revient ; « Enregistrer » envoie la fiche telle qu'elle est, puis ferme.
  const isEdit = Boolean(productId);
  const [saved, setSaved] = useState(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  // La variante dont on confirme le retrait (modification) : retirer une variante l'enlève tout de suite de l'API.
  const [removing, setRemoving] = useState(false);
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
      // La même chose sur ce qui est enregistré : ce remplissage n'est pas une modification à enregistrer.
      setSaved((current) => fillMissingWarranties(current, kind));
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

  // Rien ne part tant qu'une pièce changée n'a pas son origine (pas de valeur par défaut), qu'une affaire importée
  // n'a pas sa boîte (« Non précisée, à corriger ») ou qu'une garantie sort de 1 à 36 mois (l'API la refuserait).
  function blocked(next: ProductDraft): boolean {
    const missing = [...new Set(next.variants.flatMap((variant) => missingPartOrigins(variant)))];
    const boxes = next.variants.filter(missingBox).map((variant) => variant.sku);
    const warranties = next.variants.filter(invalidWarranty).map((variant) => variant.sku);
    setMissingOrigins(missing);
    setMissingBoxes(boxes);
    setBadWarranties(warranties);
    return missing.length > 0 || boxes.length > 0 || warranties.length > 0;
  }

  // Modification : la fiche part entière (la route n'a qu'une forme), mais seule la fenêtre ouverte a changé.
  async function save(next: ProductDraft) {
    if (!productId || blocked(next)) return;
    try {
      await updateProduct({ id: productId, body: bodyFromDraft(next) }).unwrap();
      setDraft(next);
      setSaved(next);
      setRemoving(false);
      setOpen(null);
      onSaved?.();
    } catch {
      // L'erreur s'affiche dans la fenêtre, au-dessus du bouton.
    }
  }

  // Fermer une fenêtre sans enregistrer : en modification, on revient à ce que l'API a reçu.
  function closeWindow() {
    if (isEdit) {
      setDraft(saved);
      setMissingOrigins([]);
      setMissingBoxes([]);
      setBadWarranties([]);
      updateState.reset();
    }
    setRemoving(false);
    setOpen(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (isEdit || blocked(draft)) return;
    try {
      const created = await createProduct(bodyFromDraft(draft)).unwrap();
      if (coverPhoto) {
        try {
          await uploadImage({ id: created.id, file: coverPhoto }).unwrap();
        } catch {
          router.push(`/admin/produits/${created.id}?cree=1&photoErreur=1`);
          return;
        }
      }
      router.push(`/admin/produits/${created.id}?cree=1`);
    } catch {
      // Les erreurs s'affichent au-dessus du bouton.
    }
  }

  // Le pied de chaque fenêtre en modification : ce qui bloque, l'erreur de l'API, Annuler et Enregistrer.
  const footer = (extra?: ReactNode) =>
    isEdit ? (
      <WindowFooter
        missingOrigins={missingOrigins}
        missingBoxes={missingBoxes}
        badWarranties={badWarranties}
        error={updateState.error}
        isLoading={updateState.isLoading}
        canSave={dirty}
        onCancel={closeWindow}
        onSave={() => save(draft)}
      >
        {extra}
      </WindowFooter>
    ) : extra ? (
      <div className="border-t border-line pt-4">{extra}</div>
    ) : null;

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

      <EditDialog open={open === "category"} title="Catégorie et modèle" onClose={closeWindow} closeLabel={isEdit ? "Annuler" : "Terminé"}>
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
        {footer()}
      </EditDialog>

      <EditDialog open={open === "info"} title="Fiche du produit" onClose={closeWindow} closeLabel={isEdit ? "Annuler" : "Terminé"}>
        <InfoFields draft={draft} set={set} />
        {footer()}
      </EditDialog>

      <EditDialog open={open === "specs"} title="Caractéristiques du modèle" onClose={closeWindow} closeLabel={isEdit ? "Annuler" : "Terminé"}>
        <SpecsFields draft={draft} set={set} />
        {footer()}
      </EditDialog>

      <EditDialog
        open={Boolean(editedVariant)}
        title={
          editedVariant
            ? `${CONDITION_LABELS[editedVariant.condition]} n° ${groupIndex + 1}${editedVariant.status === "draft" ? " · brouillon" : ""}`
            : "Variante"
        }
        onClose={closeWindow}
        closeLabel={isEdit ? "Annuler" : "Terminé"}
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
              // Une variante pas encore enregistrée disparaît simplement ; une variante enregistrée demande confirmation,
              // puis elle est retirée de l'API tout de suite (les commandes passées gardent leur copie).
              if (isEdit && editedVariant.id) {
                setRemoving(true);
                return;
              }
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
        {editedVariant
          ? footer(
              <>
                <VariantStatusPicker
                  status={editedVariant.status}
                  onChange={(status) => set({ variants: draft.variants.map((v) => (v.key === editedVariant.key ? { ...v, status } : v)) })}
                />
                {removing ? (
                  <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-red bg-red-soft p-3 text-sm">
                    <span className="font-semibold text-red">Retirer définitivement cette variante de la fiche ?</span>
                    <button
                      type="button"
                      className="btn btn-danger btn-small"
                      disabled={updateState.isLoading}
                      onClick={() => save({ ...draft, variants: saved.variants.filter((v) => v.key !== editedVariant.key) })}
                    >
                      Oui, retirer
                    </button>
                    <button type="button" className="btn btn-small" onClick={() => setRemoving(false)}>
                      Non
                    </button>
                  </div>
                ) : null}
              </>,
            )
          : null}
      </EditDialog>

      {/* Création : un seul envoi, en bas. Un produit existant s'enregistre dans chaque fenêtre. */}
      {!isEdit ? (
        <SaveBar
          missingOrigins={missingOrigins}
          missingBoxes={missingBoxes}
          badWarranties={badWarranties}
          error={error}
          isLoading={isLoading}
          canSubmit={Boolean(kind)}
          submitLabel="Créer le produit"
        />
      ) : null}
    </form>
  );
}
