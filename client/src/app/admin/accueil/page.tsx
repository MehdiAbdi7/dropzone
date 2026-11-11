"use client";

import { useState } from "react";
import { useStageQuery } from "@/features/admin/api/stageApi";
import BrandsSection from "@/features/admin/personalization/BrandsSection";
import CategoriesSection from "@/features/admin/personalization/CategoriesSection";
import PersonalizationCard from "@/features/admin/personalization/PersonalizationCard";
import EditDialog from "@/features/admin/products/EditDialog";
import DeviceStage from "@/features/home/DeviceStage";
import SlotRow from "@/features/admin/SlotRow";
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

// Personnalisation (11/11) : tout ce que le gérant règle en photos, une seule fois, et qui
// s'affiche partout sur le site. L'accueil (06/11) : les photos des deux socles, le hero et le
// bandeau des affaires. Les catégories : leur composition, la même sur l'accueil et dans la
// Boutique. Les marques : la photo de leur tuile dans la Boutique.
export default function PersonalizationPage() {
  return (
    <div className="max-w-6xl space-y-12">
      <div className="space-y-1">
        <h1 className="text-3xl">Personnalisation</h1>
        <p className="text-ink-muted">
          Ce que tu règles ici s&apos;affiche partout sur le site : une photo changée ici change sur l&apos;accueil comme
          dans la Boutique.
        </p>
      </div>
      <HomeSection />
      <CategoriesSection />
      <BrandsSection />
    </div>
  );
}

// L'accueil de la boutique : le gérant envoie une photo déjà sans fond (PNG ou WebP
// transparent) dans chaque emplacement, en ajoute d'autres s'il veut, puis les place à la souris
// ou au doigt sur l'aperçu, le même décor que la boutique.
function HomeSection() {
  const { data: photos, isLoading, error } = useStageQuery();
  // La fenêtre ouverte : le socle du hero, celui du bandeau, ou aucune.
  const [open, setOpen] = useState<"hero" | "deal" | null>(null);

  if (isLoading) {
    return <p className="text-ink-muted">Chargement…</p>;
  }
  if (error || !photos) {
    return <p className="field-error">{errorMessage(error)}</p>;
  }
  const count = (stage: Record<string, StagePhoto | null>) => {
    const filled = Object.values(stage).filter(Boolean).length;
    return filled === 0 ? "Les dessins de départ" : `${filled} photo${filled > 1 ? "s" : ""}`;
  };

  return (
    <section aria-labelledby="home-title" className="space-y-4">
      <div className="space-y-1">
        <h2 id="home-title" className="text-2xl">
          L&apos;accueil
        </h2>
        <p className="text-ink-muted">Les photos des deux socles de l&apos;accueil, que tu places à la souris ou au doigt.</p>
      </div>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <li>
          <PersonalizationCard
            title="Le socle du hero"
            meta={count(photos.hero)}
            preview={<div className="brand-dark absolute inset-0"><DeviceStage id="card-hero" devices={heroDevices(photos)} /></div>}
            onOpen={() => setOpen("hero")}
          />
        </li>
        <li>
          <PersonalizationCard
            title="Le socle du bandeau des affaires"
            meta={count(photos.deal)}
            preview={<div className="brand-dark absolute inset-0"><DeviceStage id="card-deal" devices={dealDevices(photos)} /></div>}
            onOpen={() => setOpen("deal")}
          />
        </li>
      </ul>

      <EditDialog open={open === "hero"} title="Le socle du hero" onClose={() => setOpen(null)}>
        <p className="text-sm text-ink-muted">{STAGE_HELP}</p>
        <StageSection
          stage="hero"
          hint="Le haut de l'accueil : un ordinateur, un smartphone, une tablette, 4 accessoires, et ce que tu ajoutes. Sans aucune photo, le hero garde ses dessins."
          editor={<HeroEditor photos={photos} />}
          named={HERO_SLOTS.map(({ slot }) => slot)}
          photos={photos.hero}
          labels={photos.labels.hero}
        />
      </EditDialog>
      <EditDialog open={open === "deal"} title="Le socle du bandeau des affaires" onClose={() => setOpen(null)}>
        <p className="text-sm text-ink-muted">{STAGE_HELP}</p>
        <StageSection
          stage="deal"
          hint="Affiché seulement quand une affaire est en stock. Un emplacement nommé vide garde son dessin (en transparence ici)."
          editor={<DealEditor photos={photos} />}
          named={DEAL_SLOTS.map(({ slot }) => slot)}
          photos={photos.deal}
          labels={photos.labels.deal}
        />
      </EditDialog>
    </section>
  );
}

// Le mode d'emploi commun aux deux socles, affiché en haut de leur fenêtre.
const STAGE_HELP =
  "Envoie une photo déjà sans fond (PNG ou WebP transparent) dans chaque emplacement, ajoute-en d'autres si tu veux, puis place-les sur le socle : glisse-les avec la souris ou le doigt, tire le rond bleu du coin (ou le curseur) pour changer leur taille. Le vide autour de l'objet est coupé tout seul.";

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

// Le contenu de la fenêtre d'un socle : l'éditeur à gauche, les emplacements à droite.
function StageSection({
  stage,
  hint,
  editor,
  named,
  photos,
  labels,
}: {
  stage: keyof StagePhotos;
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
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-3">
        <p className="text-sm text-ink-muted">{hint}</p>
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
