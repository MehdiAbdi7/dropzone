"use client";

import { useStageQuery, useUploadStagePhotoMutation, useDeleteStagePhotoMutation } from "@/features/admin/adminApi";
import DeviceStage from "@/features/home/DeviceStage";
import { DEAL_SLOTS, HERO_SLOTS, dealDevices, heroDevices, type StagePhotos } from "@/features/home/stageLayout";
import ProductImage from "@/components/ui/ProductImage";
import { errorMessage } from "@/lib/errors";

// L'accueil de la boutique (06/11) : les photos des deux socles, le hero et le bandeau des
// affaires. Chaque emplacement a sa place fixe ; le gérant y met la photo qu'il veut, déjà
// sans fond (PNG ou WebP transparent), et voit tout de suite le socle comme dans la boutique.
export default function StageAdminPage() {
  const { data: photos, isLoading, error } = useStageQuery();

  if (isLoading) {
    return <p className="text-ink-muted">Chargement…</p>;
  }
  if (error || !photos) {
    return <p className="field-error">{errorMessage(error)}</p>;
  }

  return (
    <div className="max-w-6xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl">Accueil de la boutique</h1>
        <p className="text-ink-muted">
          Les photos posées sur les socles de l&apos;accueil. Envoie des photos déjà sans fond (PNG ou WebP transparent),
          cadrées au plus près de l&apos;objet. Un emplacement vide n&apos;est pas affiché ; sans aucune photo, le hero
          garde ses dessins.
        </p>
      </div>

      <StageSection
        stage="hero"
        title="Le socle du hero"
        hint="Le haut de l'accueil : un ordinateur, un smartphone, une tablette et 4 accessoires."
        preview={<DeviceStage id="admin-hero" devices={heroDevices(photos)} className="mx-auto w-full max-w-[460px]" />}
        slots={HERO_SLOTS.map(({ slot, label }) => ({ slot, label, url: photos.hero[slot] }))}
      />
      <StageSection
        stage="deal"
        title="Le socle du bandeau des affaires"
        hint="Affiché seulement quand une affaire est en stock. Un emplacement vide garde son dessin."
        preview={<DeviceStage id="admin-deals" devices={dealDevices(photos)} className="mx-auto w-full max-w-[380px]" />}
        slots={DEAL_SLOTS.map(({ slot, label }) => ({ slot, label, url: photos.deal[slot] }))}
      />
    </div>
  );
}

function StageSection({
  stage,
  title,
  hint,
  preview,
  slots,
}: {
  stage: keyof StagePhotos;
  title: string;
  hint: string;
  preview: React.ReactNode;
  slots: { slot: string; label: string; url: string | null }[];
}) {
  return (
    <section aria-labelledby={`${stage}-title`} className="card grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-3">
        <div>
          <h2 id={`${stage}-title`} className="text-xl">
            {title}
          </h2>
          <p className="text-sm text-ink-muted">{hint}</p>
        </div>
        {/* L'aperçu : le même composant que la boutique, sur le fond sombre du hero. */}
        <div className="brand-dark rounded-2xl p-4">{preview}</div>
      </div>
      <ul className="grid content-start gap-3 sm:grid-cols-2">
        {slots.map((slot) => (
          <li key={slot.slot}>
            <SlotRow stage={stage} {...slot} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SlotRow({ stage, slot, label, url }: { stage: string; slot: string; label: string; url: string | null }) {
  const [upload, uploadState] = useUploadStagePhotoMutation();
  const [remove, removeState] = useDeleteStagePhotoMutation();
  const busy = uploadState.isLoading || removeState.isLoading;
  const failure = uploadState.error ?? removeState.error;

  return (
    <div className="flex h-full gap-3 rounded-xl border border-line p-3">
      {/* Un damier sous la photo : on voit si le fond est bien transparent. */}
      <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-[repeating-conic-gradient(var(--surface-2)_0_25%,var(--surface)_0_50%)] bg-[length:16px_16px]">
        {url ? (
          <ProductImage src={url} alt={label} sizes="80px" />
        ) : (
          <span className="flex h-full items-center justify-center text-xs text-ink-muted">Vide</span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-semibold">{label}</p>
        <div className="flex flex-wrap gap-2">
          <label className="btn btn-secondary btn-small cursor-pointer">
            {uploadState.isLoading ? "Envoi…" : url ? "Changer" : "Ajouter une photo"}
            <input
              type="file"
              accept="image/png,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) {
                  upload({ stage, slot, file });
                }
              }}
            />
          </label>
          {url ? (
            <button type="button" className="btn btn-outline btn-small" disabled={busy} onClick={() => remove({ stage, slot })}>
              Retirer
            </button>
          ) : null}
        </div>
        {failure ? <p className="field-error">{errorMessage(failure)}</p> : null}
      </div>
    </div>
  );
}
