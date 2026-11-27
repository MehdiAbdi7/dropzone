"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { ClipboardCheckIcon, DocumentIcon, GridIcon } from "@/components/ui/icons";
import ProductImage from "@/components/ui/ProductImage";
import { CONDITION_LABELS, SPEC_SUGGESTIONS } from "@/config/catalog";
import { useBrandsQuery, useCategoriesQuery, useMakersQuery, useModelsQuery, type DeviceModel } from "@/features/admin/api/catalogApi";
import { useModelColorsQuery } from "@/features/admin/api/colorsApi";
import { colorRows, colorsSummary } from "@/features/admin/catalog/modelCard";
import {
  useCreateProductMutation,
  useGiftOptionsQuery,
  useUploadImageMutation,
  useUpdateProductMutation,
  type VariantArrivalResult,
} from "@/features/admin/api/productsApi";
import { usePalette } from "../usePalette";
import EditDialog from "./EditDialog";
import Breadcrumb, { type Crumb } from "@/features/shop/Breadcrumb";
import { SheetSection, SheetTile } from "./FormParts";
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
  unitDraft,
  type ProductDraft,
} from "./productDraft";
import type { ProductKind } from "@/types/api";
import ModelColorsPanel from "./ModelColorsPanel";
import SaveBar, { WindowFooter } from "./SaveBar";
import VariantStatusPicker from "./VariantStatusPicker";
import { selectionTrail } from "./productTrail";
import VariantEditor from "./VariantEditor";
import VariantGroupPanel from "./VariantList";
import { groupState, groupStatus, variantGroups } from "./variantGroups";

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
  initialList,
  trail,
}: {
  productId?: number;
  // Les photos d'un produit existant (la page les gère avec ImageManager) : la tuile et le contenu de sa fenêtre.
  // Sans elles (création), la fenêtre Photos choisit la photo principale envoyée à la création.
  photos?: { count: number; cover: string | null; panel: ReactNode };
  // La liste à ouvrir d'office (24/11) : le lien « + Ajouter un appareil » du Catalogue arrive avec `?liste=neuf`.
  initialList?: "new" | "used";
  // Le chemin de la fiche (24/11, modification) : Catalogue › catégorie › marque › série › modèle, en liens. À la
  // création, il se construit d'après le choix en cours.
  trail?: Crumb[];
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
  const palette = usePalette();
  // La fenêtre ouverte : une partie de la fiche, ou une variante ("variant:<clé>").
  const [open, setOpen] = useState<string | null>(null);
  // Le premier pas de la création (24/11, demande de Mehdi : la catégorie et le modèle se choisissent AVANT la fiche).
  // Déjà fait quand on arrive depuis la carte d'un modèle ou la page d'un type (catégorie et modèle, ou type, remplis) ;
  // une fiche existante n'y repasse pas.
  const [started, setStarted] = useState(isEdit || Boolean(initial.categoryId && (initial.deviceModelId || initial.brandId)));
  // La liste ouverte, Neuf scellé ou Occasion (24/11) : une fenêtre à part, qui reste ouverte derrière la fenêtre d'une
  // variante (on en ouvre une depuis la liste, on ferme, on revient à la liste).
  const [listOpen, setListOpen] = useState<"new" | "used" | "colors" | null>(initialList ?? null);
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

  // Un arrivage de neuf est parti tout de suite à l'API (27/11) : le stock et le prix d'achat moyen de la variante ont changé
  // là-bas. La fiche les reprend dans ses champs ET dans ce qu'elle croit enregistré : sinon fermer la fenêtre rendrait
  // l'ancien stock, et « Enregistrer » le renverrait par-dessus l'arrivage.
  function applyArrival(key: string, result: VariantArrivalResult) {
    const update = (current: ProductDraft): ProductDraft => ({
      ...current,
      variants: current.variants.map((variant) =>
        variant.key === key
          ? { ...variant, stock: String(result.stock), purchasePrice: result.purchasePrice === null ? "" : String(result.purchasePrice) }
          : variant,
      ),
    });
    setDraft(update);
    setSaved(update);
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
  const choiceDone = Boolean(category && (!isDevice || draft.deviceModelId));
  const filledSpecs = draft.specs.filter((row) => row.key.trim() && row.value.trim());
  const openVariant = typeof open === "string" && open.startsWith("variant:") ? open.slice("variant:".length) : null;
  const editedVariant = draft.variants.find((variant) => variant.key === openVariant);
  const editedIndex = draft.variants.findIndex((variant) => variant.key === openVariant);
  // Le numéro dans sa propre liste (Neuf scellé ou Occasion) : « Occasion n° 2 », pas « Variante 7 ».
  const groupIndex = editedVariant
    ? draft.variants.filter((variant) => variant.condition === editedVariant.condition).findIndex((variant) => variant.key === editedVariant.key)
    : -1;

  const { fresh, used } = variantGroups(draft.variants);
  // Les couleurs du modèle et leurs photos (24/11) : pour un appareil dont le modèle est choisi. Les photos partent
  // tout de suite à l'API (elles appartiennent au modèle), le résumé de la tuile suit.
  const colorModelId = isDevice ? draft.deviceModelId : null;
  const { data: modelColors } = useModelColorsQuery(colorModelId ?? 0, { skip: !colorModelId });
  const colorsInfo = colorsSummary(colorRows(modelColors?.colors ?? [], palette));

  // `color` : « + Neuf » ou « + Occasion » d'une couleur de la fenêtre des couleurs, la couleur est déjà posée.
  function addVariant(condition: "new" | "refurbished", color?: string) {
    const variant = color && kind ? unitDraft(kind, condition, color) : emptyVariant(condition, kind);
    set({ variants: [...draft.variants, variant] });
    setOpen(`variant:${variant.key}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {!started ? (
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-base font-bold">Quel produit ajoutes-tu ?</h2>
            <p className="text-sm text-ink-muted">
              Choisis la catégorie, puis le modèle (ou le type pour un accessoire). Ce choix décide du reste de la fiche : ses
              champs, ses couleurs et ses variantes.
            </p>
          </div>
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
          <div className="flex justify-end">
            <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={!choiceDone} onClick={() => setStarted(true)}>
              Continuer
            </button>
          </div>
        </section>
      ) : (
        <>
      {/* Le chemin du produit (catégorie, marque, série, modèle) : un choix fait avant la fiche, qui s'y lit en liens. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Breadcrumb
          items={
            trail ??
            selectionTrail({
              category: category?.name ?? null,
              brand: brandName,
              last: isDevice ? modelName : makerName,
            })
          }
        />
        <button type="button" className="btn btn-secondary btn-small" onClick={() => (isEdit ? setOpen("category") : setStarted(false))}>
          {isEdit ? (isDevice ? "Changer le modèle" : "Changer la catégorie ou le type") : "Modifier le choix"}
        </button>
      </div>

      <SheetSection title="Présentation dans la boutique" description="Ce que le client voit sur la page du produit : son nom, son texte et ses photos.">
        <SheetTile
          title="Photos du produit"
          description={photos ? "La photo principale est celle à côté du titre. Ajoute les autres ici." : "La photo principale, envoyée à la création du produit."}
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
        {kind ? (
          <>
            <SheetTile
              title="Fiche du produit"
              description="Le nom et le texte de présentation."
              status={draft.name.trim() ? (draft.description.trim() ? draft.name : `${draft.name} · description à écrire`) : "Nom à écrire"}
              state={draft.name.trim() && draft.description.trim() ? "done" : "todo"}
              preview={<DocumentIcon size={20} />}
              onClick={() => setOpen("info")}
            />
            <SheetTile
              title="Caractéristiques"
              description="Écran, batterie, processeur… (facultatif)."
              status={filledSpecs.length > 0 ? `${filledSpecs.length} renseignée${filledSpecs.length > 1 ? "s" : ""}` : "Aucune pour l'instant"}
              state={filledSpecs.length > 0 ? "done" : "optional"}
              preview={<GridIcon size={20} />}
              onClick={() => setOpen("specs")}
            />
          </>
        ) : null}
      </SheetSection>

      {kind && (colorModelId || !isDevice) ? (
        <SheetSection
          title={isDevice ? "Couleurs et photos" : "Type et compatibilité"}
          description={
            isDevice
              ? "Une photo pour chaque couleur du modèle, et le stock de chacune."
              : "Le type d'accessoire, sa marque et les téléphones avec lesquels il va."
          }
        >
          {/* Un appareil a choisi sa catégorie et son modèle avant la fiche (chemin en haut) ; pour un accessoire, les
              téléphones compatibles sont du contenu : ils restent ici. */}
          {!isDevice ? (
            <SheetTile
              title="Type, marque et compatibilité"
              description="La catégorie, le type, la marque et les téléphones compatibles."
              status={category ? [category.name, brandName ?? makerName].filter(Boolean).join(" · ") : "À choisir"}
              state={category ? "done" : "todo"}
              preview={<ClipboardCheckIcon size={20} />}
              onClick={() => setOpen("category")}
            />
          ) : null}
          {colorModelId ? (
            <SheetTile
              title="Couleurs et photos"
              description="Une photo pour chaque couleur, et le stock de chacune."
              status={modelColors ? colorsInfo.text : "Chargement…"}
              state={modelColors ? colorsInfo.state : "optional"}
              preview={
                modelColors?.colors.find((color) => color.photoUrl)?.photoUrl ? (
                  <ProductImage src={modelColors.colors.find((color) => color.photoUrl)?.photoUrl ?? null} alt="" sizes="48px" />
                ) : (
                  <GridIcon size={20} />
                )
              }
              onClick={() => setListOpen("colors")}
            />
          ) : null}
        </SheetSection>
      ) : null}

      {kind ? (
        <SheetSection
          title="Stock et prix"
          description="Ce qui est en vente : un prix et un stock par variante. Une variante en brouillon n'est vendue nulle part."
        >
          <SheetTile
            title="Neuf scellé"
            description={isDevice ? "Les appareils neufs, dans leur boîte scellée." : "Les variantes de l'accessoire (taille, couleur…)."}
            status={groupStatus(fresh, "new")}
            state={groupState(fresh)}
            preview={<span className="font-display text-lg font-bold text-blue-ink">{fresh.variants.length}</span>}
            onClick={() => setListOpen("new")}
          />
          {/* Un accessoire ne se vend que neuf : pas de tuile Occasion. */}
          {isDevice ? (
            <SheetTile
              title="Occasion"
              description="Les appareils testés, chacun avec sa fiche d'état."
              status={groupStatus(used, "used")}
              state={groupState(used)}
              preview={<span className="font-display text-lg font-bold text-red">{used.variants.length}</span>}
              onClick={() => setListOpen("used")}
            />
          ) : null}
        </SheetSection>
      ) : null}
        </>
      )}

      <EditDialog
        open={listOpen === "new"}
        title="Neuf scellé"
        onClose={() => setListOpen(null)}
        toolbar={
          <button type="button" className="btn btn-secondary btn-small" onClick={() => addVariant("new")}>
            + Neuf scellé
          </button>
        }
      >
        <VariantGroupPanel
          group={fresh}
          kind="new"
          empty="Aucun neuf scellé. Ajoute une variante par couleur et stockage."
          onEdit={(key) => setOpen(`variant:${key}`)}
        />
      </EditDialog>

      <EditDialog
        open={listOpen === "used"}
        title="Occasion"
        onClose={() => setListOpen(null)}
        toolbar={
          <button type="button" className="btn btn-secondary btn-small" onClick={() => addVariant("refurbished")}>
            + Occasion
          </button>
        }
      >
        <VariantGroupPanel
          group={used}
          kind="used"
          empty="Aucune occasion. Chaque appareil d'occasion a sa propre fiche d'état."
          onEdit={(key) => setOpen(`variant:${key}`)}
        />
      </EditDialog>

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

      <EditDialog open={listOpen === "colors"} title="Couleurs et photos" onClose={() => setListOpen(null)}>
        {colorModelId ? <ModelColorsPanel modelId={colorModelId} onAddVariant={(color, condition) => addVariant(condition, color)} /> : null}
      </EditDialog>

      <EditDialog
        open={open === "category"}
        title={isEdit ? "Changer la catégorie ou le modèle" : "Catégorie et modèle"}
        onClose={closeWindow}
        closeLabel={isEdit ? "Annuler" : "Terminé"}
      >
        {isEdit ? (
          <p role="note" className="rounded-lg border border-line bg-amber-soft p-3 text-sm text-ink">
            Attention : ce produit est peut-être déjà en vente. Les couleurs du modèle et leurs photos ne suivent pas un
            changement de modèle, et un accessoire ne peut pas être d&apos;occasion. Vérifie les variantes ensuite.
          </p>
        ) : null}
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
            productId={productId}
            onArrived={(result) => applyArrival(editedVariant.key, result)}
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
      {!isEdit && started ? (
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
