"use client";

import ProductImage from "@/components/ui/ProductImage";
import { useDeleteStagePhotoMutation, useStageQuery, useUploadStagePhotoMutation } from "@/features/admin/adminApi";
import StageEditor from "@/features/admin/StageEditor";
import {
  DEAL_SLOTS,
  HERO_SLOTS,
  dealDevices,
  heroDevices,
  type StageDevice,
  type StagePhotos,
} from "@/features/home/stageLayout";
import { errorMessage } from "@/lib/errors";

const HERO_LABELS = Object.fromEntries(HERO_SLOTS.map(({ slot, label }) => [slot, label]));
const DEAL_LABELS = Object.fromEntries(DEAL_SLOTS.map(({ slot, label }) => [slot, label]));

// L'éditeur reçoit les photos (déplaçables) et les dessins restés à leur place.
function split(devices: StageDevice[], filled: Record<string, unknown>) {
  return {
    devices: devices.filter((device) => filled[device.slot]),
    fixed: devices.filter((device) => !filled[device.slot]),
  };
}

// L'accueil de la boutique (06/11) : les photos des deux socles, le hero et le bandeau des
// affaires. Le gérant envoie une photo déjà sans fond (PNG ou WebP transparent) dans chaque
// emplacement, puis la place à la souris ou au doigt sur l'aperçu, le même décor que la boutique.
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
          Envoie une photo déjà sans fond (PNG ou WebP transparent) dans chaque emplacement, puis place-la sur le socle :
          glisse-la avec la souris ou le doigt, tire le rond bleu du coin (ou le curseur) pour changer sa taille. Le vide
          autour de l&apos;objet est coupé tout seul. Sans aucune photo, le hero garde ses dessins.
        </p>
      </div>

      <StageSection
        stage="hero"
        title="Le socle du hero"
        hint="Le haut de l'accueil : un ordinateur, un smartphone, une tablette et 4 accessoires."
        editor={<HeroEditor photos={photos} />}
        slots={HERO_SLOTS.map(({ slot, label }) => ({ slot, label, url: photos.hero[slot]?.url ?? null }))}
      />
      <StageSection
        stage="deal"
        title="Le socle du bandeau des affaires"
        hint="Affiché seulement quand une affaire est en stock. Un emplacement vide garde son dessin (en transparence ici)."
        editor={<DealEditor photos={photos} />}
        slots={DEAL_SLOTS.map(({ slot, label }) => ({ slot, label, url: photos.deal[slot]?.url ?? null }))}
      />
    </div>
  );
}

// `key` : quand les photos ou leurs places enregistrées changent (envoi, « Tout remettre au
// départ »), l'éditeur repart de ce que dit l'API.
function HeroEditor({ photos }: { photos: StagePhotos }) {
  const { devices, fixed } = split(heroDevices(photos), photos.hero);
  return <StageEditor key={JSON.stringify(photos.hero)} stage="hero" devices={devices} fixed={fixed} labels={HERO_LABELS} />;
}

function DealEditor({ photos }: { photos: StagePhotos }) {
  const { devices, fixed } = split(dealDevices(photos), photos.deal);
  return <StageEditor key={JSON.stringify(photos.deal)} stage="deal" devices={devices} fixed={fixed} labels={DEAL_LABELS} />;
}

function StageSection({
  stage,
  title,
  hint,
  editor,
  slots,
}: {
  stage: keyof StagePhotos;
  title: string;
  hint: string;
  editor: React.ReactNode;
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
        {/* L'éditeur : le même décor que la boutique, sur le fond sombre du hero. */}
        <div className="brand-dark rounded-2xl p-4">{editor}</div>
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
