"use client";

import { useState } from "react";
import ProductImage from "@/components/ui/ProductImage";
import { useDeleteStagePhotoMutation, useStageQuery, useUpdateStageLabelMutation, useUploadStagePhotoMutation } from "@/features/admin/api/stageApi";
import StageEditor from "@/features/admin/StageEditor";
import {
  DEAL_SLOTS,
  HERO_SLOTS,
  MAX_EXTRA_SLOTS,
  dealDevices,
  extraSlots,
  heroDevices,
  nextExtraSlot,
  slotLabel,
  type StageDevice,
  type StagePhoto,
  type StagePhotos,
} from "@/features/home/stageLayout";
import { errorMessage } from "@/lib/errors";

// L'éditeur reçoit les photos (déplaçables) et les dessins restés à leur place.
function split(devices: StageDevice[], filled: Record<string, unknown>) {
  return {
    devices: devices.filter((device) => filled[device.slot]),
    fixed: devices.filter((device) => !filled[device.slot]),
  };
}

// L'accueil de la boutique (06/11) : les photos des deux socles, le hero et le bandeau des
// affaires. Le gérant envoie une photo déjà sans fond (PNG ou WebP transparent) dans chaque
// emplacement, en ajoute d'autres s'il veut, puis les place à la souris ou au doigt sur
// l'aperçu, le même décor que la boutique.
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
        <h1 className="text-3xl">Personnalisation</h1>
        <p className="text-ink-muted">
          L&apos;accueil de la boutique : envoie une photo déjà sans fond (PNG ou WebP transparent) dans chaque emplacement, ajoute-en d&apos;autres si
          tu veux, puis place-les sur le socle : glisse-les avec la souris ou le doigt, tire le rond bleu du coin (ou le
          curseur) pour changer leur taille. Le vide autour de l&apos;objet est coupé tout seul. Sans aucune photo, le
          hero garde ses dessins.
        </p>
      </div>

      <StageSection
        stage="hero"
        title="Le socle du hero"
        hint="Le haut de l'accueil : un ordinateur, un smartphone, une tablette, 4 accessoires, et ce que tu ajoutes."
        editor={<HeroEditor photos={photos} />}
        named={HERO_SLOTS.map(({ slot }) => slot)}
        photos={photos.hero}
        labels={photos.labels.hero}
      />
      <StageSection
        stage="deal"
        title="Le socle du bandeau des affaires"
        hint="Affiché seulement quand une affaire est en stock. Un emplacement nommé vide garde son dessin (en transparence ici)."
        editor={<DealEditor photos={photos} />}
        named={DEAL_SLOTS.map(({ slot }) => slot)}
        photos={photos.deal}
        labels={photos.labels.deal}
      />
    </div>
  );
}

// `key` : quand les photos ou leurs places enregistrées changent (envoi, « Tout remettre au
// départ »), l'éditeur repart de ce que dit l'API.
function HeroEditor({ photos }: { photos: StagePhotos }) {
  const { devices, fixed } = split(heroDevices(photos), photos.hero);
  return <StageEditor key={JSON.stringify(photos.hero)} stage="hero" devices={devices} fixed={fixed} />;
}

function DealEditor({ photos }: { photos: StagePhotos }) {
  const { devices, fixed } = split(dealDevices(photos), photos.deal);
  return <StageEditor key={JSON.stringify(photos.deal)} stage="deal" devices={devices} fixed={fixed} />;
}

function StageSection({
  stage,
  title,
  hint,
  editor,
  named,
  photos,
  labels,
}: {
  stage: keyof StagePhotos;
  title: string;
  hint: string;
  editor: React.ReactNode;
  named: string[];
  photos: Record<string, StagePhoto | null>;
  labels: Record<string, string | null>;
}) {
  // Un emplacement en plus, créé par « Ajouter un emplacement » : une case vide jusqu'à
  // l'envoi de sa photo (l'API ne garde que les emplacements qui ont une photo).
  const [pending, setPending] = useState<string | null>(null);
  const extras = extraSlots(photos);
  // Sa photo envoyée, la case en attente devient un vrai emplacement : on l'oublie, sinon
  // « Retirer » la ferait revenir vide. Mise à jour pendant le rendu, gardée par la condition.
  if (pending && extras.includes(pending)) {
    setPending(null);
  }
  const waiting = pending && !extras.includes(pending) ? pending : null;
  const slots = [...named, ...extras, ...(waiting ? [waiting] : [])];
  const full = extras.length >= MAX_EXTRA_SLOTS;

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
      <div className="space-y-3">
        <ul className="grid content-start gap-3">
          {slots.map((slot) => (
            <li key={slot}>
              <SlotRow
                stage={stage}
                slot={slot}
                label={slotLabel(slot, labels[slot] ?? photos[slot]?.label)}
                url={photos[slot]?.url ?? null}
                canRename={slot.startsWith("extra-") ? Boolean(photos[slot]?.url || slot === waiting) : true}
                onCancel={slot === waiting ? () => setPending(null) : undefined}
              />
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-secondary btn-small"
            disabled={full || Boolean(waiting)}
            onClick={() => setPending(nextExtraSlot(photos))}
          >
            + Ajouter un emplacement
          </button>
          <span className="text-xs text-ink-muted">
            {full
              ? `${MAX_EXTRA_SLOTS} emplacements en plus au maximum.`
              : waiting
                ? "Envoie d'abord la photo de la nouvelle case."
                : `${extras.length} en plus sur ${MAX_EXTRA_SLOTS}. « Retirer » supprime un emplacement en plus.`}
          </span>
        </div>
      </div>
    </section>
  );
}

function SlotRow({
  stage,
  slot,
  label,
  url,
  canRename,
  onCancel,
}: {
  stage: string;
  slot: string;
  label: string;
  url: string | null;
  canRename: boolean;
  // La case d'un emplacement en plus pas encore envoyé : « Annuler » la fait disparaître.
  onCancel?: () => void;
}) {
  const [upload, uploadState] = useUploadStagePhotoMutation();
  const [remove, removeState] = useDeleteStagePhotoMutation();
  const [updateLabel, labelState] = useUpdateStageLabelMutation();
  const [title, setTitle] = useState(label);
  const [editing, setEditing] = useState(false);
  const busy = uploadState.isLoading || removeState.isLoading || labelState.isLoading;
  const failure = uploadState.error ?? removeState.error ?? labelState.error;
  const titleChanged = title.trim() !== label;

  async function saveLabel() {
    try {
      await updateLabel({ stage, slot, label: title.trim() }).unwrap();
      setTitle(title.trim());
      setEditing(false);
    } catch {
      // L'erreur de la mutation est affichée dans la carte.
    }
  }

  return (
    <div className="flex gap-3 rounded-xl border border-line bg-surface p-3 sm:gap-4">
      {/* Un damier sous la photo : on voit si le fond est bien transparent. */}
      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-[repeating-conic-gradient(var(--surface-2)_0_25%,var(--surface)_0_50%)] bg-[length:16px_16px] sm:size-[4.5rem]">
        {url ? (
          <ProductImage src={url} alt={label} sizes="72px" />
        ) : (
          <span className="flex h-full items-center justify-center text-xs text-ink-muted">Vide</span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <p className="min-w-0 break-words pt-1 text-sm font-semibold">{label}</p>
          {canRename ? (
            <button
              type="button"
              className="btn btn-outline btn-small shrink-0"
              disabled={busy}
              onClick={() => {
                setTitle(label);
                setEditing((current) => !current);
              }}
            >
              {editing ? "Fermer" : "Renommer"}
            </button>
          ) : null}
        </div>
        {editing ? (
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[12rem] flex-1 space-y-1 text-xs font-medium text-ink-muted">
              <span>Nouvel intitulé</span>
              <input
                type="text"
                maxLength={60}
                value={title}
                className="field-input w-full"
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              disabled={!titleChanged || !title.trim() || busy}
              onClick={saveLabel}
            >
              {labelState.isLoading ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-small"
              disabled={busy}
              onClick={() => {
                setTitle(label);
                setEditing(false);
              }}
            >
              Annuler
            </button>
          </div>
        ) : null}
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
          {onCancel ? (
            <button type="button" className="btn btn-outline btn-small" disabled={busy} onClick={onCancel}>
              Annuler
            </button>
          ) : null}
        </div>
        {failure ? <p className="field-error">{errorMessage(failure)}</p> : null}
      </div>
    </div>
  );
}
