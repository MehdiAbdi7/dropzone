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
import RepairEditDialog from "./RepairEditDialog";
import RepairParts from "./RepairParts";
import RepairReceipt from "./RepairReceipt";
import RepairStepper from "./RepairStepper";
import { RepairBadge } from "./RepairsTable";
import { REPAIR_STATUS_LABELS, actionLabel, confirmText, repairNumber, repairSteps, repairTotal, warrantyLabel } from "./repairsView";

// La fenêtre d'une fiche, ouverte au clic sur une ligne de la liste (ou juste après la création). Au centre sur
// ordinateur, une feuille qui monte du bas sur téléphone (`.order-window`, la même que les commandes). `id` vient
// de l'adresse (`?reparation=12`) : null = fermée.
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
  return <Content repair={repair} onClose={onClose} />;
}

const Row = ({ label, value }: { label: string; value: string | null }) => (
  <div className="grid grid-cols-[9rem_1fr] gap-2 text-sm">
    <dt className="font-semibold">{label}</dt>
    <dd className="min-w-0 break-words">{value || <span className="text-ink-muted">Non précisé</span>}</dd>
  </div>
);

function Content({ repair, onClose }: { repair: RepairDetail; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const [change, changing] = useChangeRepairStatusMutation();
  const [remove, removing] = useDeleteRepairMutation();
  const steps = repairSteps(repair.status, repair.underWarranty, repair.events.map((event) => event.status));
  const total = repairTotal(repair);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl font-bold text-blue-ink">{repairNumber(repair.number)}</h2>
            <RepairBadge status={repair.status} />
          </div>
          <p className="font-semibold">{repair.deviceName}</p>
          <p className="text-sm text-ink-muted">{warrantyLabel(repair)}</p>
        </div>
        <button type="button" className="btn btn-secondary btn-small" onClick={onClose} aria-label="Fermer la fiche">
          <CloseIcon />
        </button>
      </header>

      <RepairStepper steps={steps} />

      {repair.nextStatuses.length > 0 ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {repair.nextStatuses.map((status, index) => {
              const label = actionLabel(repair.status, status, repair.underWarranty);
              const className = `btn ${index === 0 ? "btn-primary" : "btn-secondary"}`;
              const warning = confirmText(status, repair.parts);
              // « Devis refusé » et « Rendre l'appareil » ne se défont pas : une confirmation d'abord.
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
          </div>
          {repair.nextStatuses.includes("returned") ? (
            <p className="text-sm text-ink-muted">Aucun paiement n&apos;est encore enregistré à ce stade : l&apos;argent de la réparation viendra avec l&apos;étape suivante de l&apos;atelier.</p>
          ) : null}
          {changing.error ? (
            <p role="alert" className="field-error">
              {errorMessage(changing.error)}
            </p>
          ) : null}
        </div>
      ) : null}

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

      <section className="space-y-1" aria-label="Prix">
        <h3 className="text-lg">Prix</h3>
        <p className="text-sm">Main-d&apos;œuvre : {repair.laborPrice === null ? <span className="text-ink-muted">à fixer</span> : formatPrice(repair.laborPrice)}</p>
        <p className="font-bold">{repair.underWarranty ? "Sous garantie, gratuit" : `Total pour le client : ${formatPrice(total)}`}</p>
      </section>

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
        {repair.status !== "returned" ? (
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setEditing(true)}>
            Modifier
          </button>
        ) : null}
        {repair.status !== "returned" ? (
          <ConfirmDialog
            trigger="Supprimer la fiche"
            triggerClassName="btn btn-danger btn-small"
            title={`Supprimer ${repairNumber(repair.number)} ?`}
            confirmLabel="Supprimer"
            onConfirm={async () => {
              try {
                await remove(repair.id).unwrap();
                onClose();
              } catch {
                // L'erreur est affichée sous les boutons.
              }
            }}
          >
            Les pièces déjà sorties du stock y reviennent. Le journal des pièces garde la trace.
          </ConfirmDialog>
        ) : null}
      </div>
      {removing.error ? (
        <p role="alert" className="field-error">
          {errorMessage(removing.error)}
        </p>
      ) : null}

      <RepairEditDialog open={editing} repair={repair} onClose={() => setEditing(false)} />
    </div>
  );
}
