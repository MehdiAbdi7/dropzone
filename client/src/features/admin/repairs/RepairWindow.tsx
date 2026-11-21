"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/ui/icons";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  useChangeRepairStatusMutation,
  useDeleteRepairMutation,
  useRepairQuery,
  type RepairDetail,
} from "@/features/admin/api/repairsApi";
import { isOwnCloseEvent } from "@/features/admin/products/dialogEvents";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatPrice } from "@/lib/format";
import { useAdminRole } from "@/features/admin/AdminRoleContext";
import RepairEditDialog from "./RepairEditDialog";
import RepairParts from "./RepairParts";
import RepairReturnDialog from "./RepairReturnDialog";
import RepairReceipt from "./RepairReceipt";
import RepairReplaceDialog from "./RepairReplaceDialog";
import RepairStepper from "./RepairStepper";
import { canReplace } from "./replaceRules";
import { RepairBadge } from "./RepairsTable";
import {
  REPAIR_STATUS_LABELS,
  actionLabel,
  allowedTargets,
  confirmText,
  initialRepairStep,
  paidText,
  repairCapabilities,
  repairNumber,
  repairSteps,
  repairTotal,
  warrantyLabel,
  type RepairStep,
} from "./repairsView";

// La fenêtre d'une fiche, ouverte au clic sur une ligne de la liste (ou juste après la création). Au centre sur
// ordinateur, une feuille qui monte du bas sur téléphone (`.order-window`, la même que les commandes). Comme celle
// d'une commande (21/11) : elle s'ouvre sur l'étape où en est l'appareil, chaque pastille de la frise se regarde, et
// les boutons n'existent que sur l'étape en cours. `id` vient de l'adresse (`?reparation=12`) : null = fermée.
export default function RepairWindow({ id, onClose }: { id: number | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const open = id !== null;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      // Une fenêtre ouverte DANS la fiche (Modifier, Supprimer) fait remonter son événement de fermeture : la fiche ne
      // réagit qu'à la sienne.
      onClose={(event) => {
        if (isOwnCloseEvent(event)) onClose();
      }}
      aria-label="Fiche de réparation" className="order-window border border-line bg-surface p-0 text-ink backdrop:bg-black/70">
      {/* Monté seulement fenêtre ouverte : chaque ouverture repart de la fiche telle qu'elle est. */}
      {id !== null ? <Body id={id} onClose={onClose} /> : null}
    </dialog>
  );
}

function Body({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: repair, isError } = useRepairQuery(id);

  if (isError) {
    return (
      <div className="space-y-4 p-6">
        <p role="alert">Cette fiche est introuvable.</p>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Fermer
        </button>
      </div>
    );
  }
  if (!repair) return <p className="p-6 text-ink-muted">Chargement…</p>;
  // `key` = l'étape : quand la fiche avance (le bouton vient de servir), la fenêtre se replace sur la nouvelle étape
  // en cours, au lieu de rester sur l'ancienne.
  return <Content key={repair.status} repair={repair} onClose={onClose} />;
}

const Row = ({ label, value }: { label: string; value: string | null }) => (
  <div className="grid grid-cols-[9rem_1fr] gap-2 text-sm">
    <dt className="font-semibold">{label}</dt>
    <dd className="min-w-0 break-words">{value || <span className="text-ink-muted">Non précisé</span>}</dd>
  </div>
);

type View = "steps" | "details";

function Content({ repair, onClose }: { repair: RepairDetail; onClose: () => void }) {
  const caps = repairCapabilities(useAdminRole());
  const steps = repairSteps(repair.status, repair.underWarranty, repair.events.map((event) => event.status));
  const [selected, setSelected] = useState(() => initialRepairStep(steps));
  const [view, setView] = useState<View>("steps");
  const step = steps[selected];

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-line border-l-4 border-l-blue bg-surface px-5 py-3">
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold text-blue-ink">{repairNumber(repair.number)}</h2>
            <RepairBadge status={repair.status} underWarranty={repair.underWarranty} />
          </div>
          <p className="font-semibold">{repair.deviceName}</p>
          <p className="text-sm text-ink-muted">
            {repair.fullName} · {warrantyLabel(repair)}
          </p>
          {caps.seesClientMoney && paidText(repair) ? <p className="text-sm font-semibold">{paidText(repair)}</p> : null}
          {repair.replacementOrderNumber !== null ? (
            <p className="text-sm font-semibold">Appareil remplacé sous garantie (commande {repair.replacementOrderNumber}) : l&apos;appareil en panne est dans les Reprises.</p>
          ) : null}
        </div>
        <button type="button" className="icon-btn shrink-0" onClick={onClose} aria-label="Fermer la fiche">
          <CloseIcon />
        </button>
      </header>

      <div className="space-y-5 p-5">
        <RepairStepper
          steps={steps}
          selected={view === "steps" ? selected : null}
          onSelect={(index) => {
            setSelected(index);
            setView("steps");
          }}
        />
        <div role="group" aria-label="Vue de la fiche" className="flex gap-2">
          <button type="button" className="chip" aria-pressed={view === "steps"} onClick={() => setView("steps")}>
            Étape
          </button>
          <button type="button" className="chip" aria-pressed={view === "details"} onClick={() => setView("details")}>
            Détails
          </button>
        </div>

        {view === "steps" && step ? <StepPanel repair={repair} step={step} steps={steps} /> : null}
        {view === "details" ? <Details repair={repair} onDeleted={onClose} /> : null}
      </div>
    </div>
  );
}

// Ce que dit la pastille choisie : les actions et les pièces si c'est l'étape en cours, sinon un constat.
function StepPanel({ repair, step, steps }: { repair: RepairDetail; step: RepairStep; steps: RepairStep[] }) {
  if (step.state === "current") return <StepActions repair={repair} />;

  if (step.state === "exit") {
    return <p>Le devis a été refusé : l&apos;appareil sort du circuit de réparation. Il n&apos;y a plus qu&apos;à le rendre au client, sans réparation.</p>;
  }

  if (step.state === "skipped") {
    return <p className="text-ink-muted">Pas de devis : l&apos;appareil est sous garantie, ou le client était d&apos;accord au comptoir.</p>;
  }

  if (step.state === "done") {
    const reached = repair.events.find((event) => event.status === step.status);
    return <p className="text-ink-muted">Étape terminée{reached ? ` le ${formatDate(reached.createdAt)}` : ""}.</p>;
  }

  // Une étape à venir : on dit où en est la fiche.
  const current = steps.find((other) => other.state === "current" || other.state === "exit");
  return <p className="text-ink-muted">{current ? `Pas encore : la fiche est à l'étape « ${current.label} ». Celle-ci viendra ensuite.` : "Cette fiche n'avancera plus."}</p>;
}

// Les actions de l'étape où en est la fiche, et seulement elles : les passages d'étape permis à ce rôle, le
// remplacement sous garantie, puis les pièces (qu'on ajoute tant que l'appareil n'est pas Prêt).
function StepActions({ repair }: { repair: RepairDetail }) {
  // Ce que ce rôle voit et fait (étape 5) : l'API refuse le reste et retire l'argent du client pour le technicien.
  const role = useAdminRole();
  const caps = repairCapabilities(role);
  const targets = allowedTargets(role, repair.nextStatuses, repair.underWarranty);
  const [returning, setReturning] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [change, changing] = useChangeRepairStatusMutation();
  const replaceable = canReplace(repair, caps.replacesDevice);

  return (
    <div className="space-y-5">
      {targets.length > 0 || replaceable ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {targets.map((status, index) => {
              const label = actionLabel(repair.status, status, repair.underWarranty);
              const className = `btn ${index === 0 ? "btn-primary" : "btn-secondary"}`;
              // « Rendre l'appareil » a sa propre fenêtre (le paiement) ; « Devis refusé » une confirmation d'abord.
              if (status === "returned") {
                return (
                  <button key={status} type="button" className={className} onClick={() => setReturning(true)}>
                    {label}
                  </button>
                );
              }
              const warning = confirmText(status, repair.parts);
              return warning ? (
                <ConfirmDialog key={status} trigger={label} triggerClassName={className} title={`${label} ?`} confirmLabel={label} onConfirm={() => change({ id: repair.id, status })}>
                  {warning}
                </ConfirmDialog>
              ) : (
                <button key={status} type="button" className={className} disabled={changing.isLoading} onClick={() => change({ id: repair.id, status })}>
                  {label}
                </button>
              );
            })}
            {replaceable ? (
              <button type="button" className="btn btn-secondary" onClick={() => setReplacing(true)}>
                Remplacer l&apos;appareil
              </button>
            ) : null}
          </div>
          {changing.error ? (
            <p role="alert" className="field-error">
              {errorMessage(changing.error)}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-ink-muted">{REPAIR_STATUS_LABELS[repair.status]} : rien à faire ici pour votre rôle.</p>
      )}

      <RepairParts repair={repair} />

      <RepairReturnDialog open={returning} repair={repair} onClose={() => setReturning(false)} />
      <RepairReplaceDialog open={replacing} repair={repair} onClose={() => setReplacing(false)} />
    </div>
  );
}

// L'onglet Détails : le client, la panne, les pièces et le prix, l'historique des étapes, puis le bon de dépôt, la
// modification et la suppression de la fiche.
function Details({ repair, onDeleted }: { repair: RepairDetail; onDeleted: () => void }) {
  const role = useAdminRole();
  const caps = repairCapabilities(role);
  const [editing, setEditing] = useState(false);
  const [remove, removing] = useDeleteRepairMutation();
  const total = caps.seesClientMoney ? repairTotal(repair) : 0;

  return (
    <div className="space-y-5">
      <dl className="space-y-1.5 rounded-lg border border-line bg-surface-2 p-3">
        <Row label="Client" value={repair.fullName} />
        <Row label="Téléphone" value={repair.phone} />
        <Row label="Couleur" value={repair.deviceColor} />
        <Row label="État à l'arrivée" value={repair.deviceState} />
        <Row label="Panne décrite" value={repair.issue} />
        <Row label="Accessoires" value={repair.accessories} />
        {repair.originOrderNumber !== null ? <Row label="Vente d'origine" value={`Commande ${repair.originOrderNumber}`} /> : null}
        {repair.note ? <Row label="Note du technicien" value={repair.note} /> : null}
      </dl>

      <RepairParts repair={repair} />

      {caps.seesClientMoney ? (
        <section className="space-y-1" aria-label="Prix">
          <h3 className="text-lg">Prix</h3>
          <p className="text-sm">Main-d&apos;œuvre : {repair.laborPrice === null ? <span className="text-ink-muted">à fixer</span> : formatPrice(repair.laborPrice)}</p>
          <p className="font-bold">{repair.underWarranty ? "Sous garantie, gratuit" : `Total pour le client : ${formatPrice(total)}`}</p>
        </section>
      ) : null}

      <section className="space-y-1" aria-label="Étapes de la fiche">
        <h3 className="text-lg">Historique</h3>
        <ul className="space-y-1 text-sm">
          {repair.events.map((event, index) => (
            <li key={`${event.status}-${index}`}>
              <span className="font-semibold">{REPAIR_STATUS_LABELS[event.status]}</span>
              <span className="text-ink-muted"> · {formatDate(event.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <RepairReceipt repair={repair} />
        {repair.status !== "returned" && (caps.editsRepair || role === "technician") ? (
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setEditing(true)}>
            Modifier
          </button>
        ) : null}
        {caps.deletesRepair && repair.replacementOrderNumber === null ? (
          <ConfirmDialog
            trigger="Supprimer la fiche"
            triggerClassName="btn btn-danger btn-small"
            title={`Supprimer ${repairNumber(repair.number)} ?`}
            confirmLabel="Supprimer"
            onConfirm={async () => {
              try {
                await remove(repair.id).unwrap();
                onDeleted();
              } catch {
                // L'erreur est affichée sous les boutons.
              }
            }}
          >
            {repair.status === "returned"
              ? "La réparation est rendue : l'argent encaissé est rendu par une correction de la caisse du jour (elle doit être ouverte), les pièces sorties reviennent au stock et une trace reste dans l'Historique."
              : "Les pièces déjà sorties du stock y reviennent. Le journal des pièces garde la trace."}
          </ConfirmDialog>
        ) : null}
      </div>
      {removing.error ? (
        <p role="alert" className="field-error">
          {errorMessage(removing.error)}
        </p>
      ) : null}

      <RepairEditDialog open={editing} noteOnly={!caps.editsRepair} repair={repair} onClose={() => setEditing(false)} />
    </div>
  );
}
