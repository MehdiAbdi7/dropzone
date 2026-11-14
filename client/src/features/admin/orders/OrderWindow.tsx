"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/ui/icons";
import { ORDER_TYPE_LABELS, STATUS_LABELS } from "@/config/catalog";
import { useAdminOrderQuery, type AdminOrder } from "@/features/admin/api/ordersApi";
import { acknowledge } from "@/features/admin/alerts/acknowledged";
import { formatDate } from "@/lib/format";
import EditOrderForm from "./EditOrderForm";
import OrderDetails from "./OrderDetails";
import OrderStepper from "./OrderStepper";
import StepActions from "./StepActions";
import { dailyLabel } from "./orderLabels";
import { initialStep, orderSteps, type OrderStep } from "./orderSteps";

// La fenêtre d'une commande, ouverte au clic sur une ligne du tableau. Au centre sur ordinateur, une
// feuille qui monte du bas sur téléphone (`.order-window`). Elle s'ouvre sur l'étape où en est la
// commande ; la frise permet de voir les autres étapes. L'élément natif <dialog> gère le fond, le
// focus et la touche Échap. `id` vient de l'adresse (`?commande=12`) : null = fermée.
export default function OrderWindow({ id, onClose }: { id: number | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const open = id !== null;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog ref={dialog} onClose={onClose} aria-label="Commande" className="order-window border border-line bg-surface p-0 text-ink backdrop:bg-black/70">
      {/* Le contenu n'est monté que fenêtre ouverte : chaque ouverture repart de la commande telle qu'elle est. */}
      {id !== null ? <OrderWindowBody id={id} onClose={onClose} /> : null}
    </dialog>
  );
}

function OrderWindowBody({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: order, isError } = useAdminOrderQuery(id);

  if (isError) {
    return (
      <div className="space-y-4 p-6">
        <p role="alert">Cette commande est introuvable.</p>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Fermer
        </button>
      </div>
    );
  }
  if (!order) return <p className="p-6 text-ink-muted">Chargement…</p>;

  // `key` = l'état : quand la commande change d'étape (le bouton vient de servir), la fenêtre se
  // replace sur la nouvelle étape en cours, au lieu de rester sur l'ancienne.
  return <OrderContent key={order.status} order={order} onClose={onClose} />;
}

type View = "steps" | "details" | "edit";

function OrderContent({ order, onClose }: { order: AdminOrder; onClose: () => void }) {
  const steps = orderSteps(order.type, order.status);
  const [selected, setSelected] = useState(() => initialStep(steps));
  // Sans étapes (une vente au magasin), seul « Détails » existe.
  const [view, setView] = useState<View>(steps.length === 0 ? "details" : "steps");

  // Ouvrir une commande en attente, c'est l'avoir vue : l'alerte (son et bannière) se tait pour elle.
  const { id, status } = order;
  useEffect(() => {
    if (status === "pending" || status === "reserved") acknowledge([id]);
  }, [id, status]);

  const step = steps[selected];

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-line border-l-4 border-l-blue bg-surface px-5 py-3">
        <div className="min-w-0">
          <h2 className="text-lg">Commande {dailyLabel(order.dailyNumber, order.businessDate)}</h2>
          <p className="text-sm text-ink-muted">
            {ORDER_TYPE_LABELS[order.type]} · suivi {order.number} · {formatDate(order.createdAt)}
          </p>
        </div>
        <button type="button" className="icon-btn shrink-0" aria-label="Fermer la commande" onClick={onClose}>
          <CloseIcon />
        </button>
      </header>

      <div className="space-y-5 p-5">
        {steps.length > 0 ? (
          <>
            <OrderStepper
              steps={steps}
              selected={view === "steps" ? selected : null}
              onSelect={(index) => {
                setSelected(index);
                setView("steps");
              }}
            />
            <div role="group" aria-label="Vue de la commande" className="flex gap-2">
              <button type="button" className="chip" aria-pressed={view === "steps"} onClick={() => setView("steps")}>
                Étape
              </button>
              <button type="button" className="chip" aria-pressed={view !== "steps"} onClick={() => setView("details")}>
                Détails
              </button>
            </div>
          </>
        ) : null}

        {view === "steps" && step ? <StepPanel order={order} step={step} steps={steps} /> : null}
        {view === "details" ? <OrderDetails order={order} onEdit={() => setView("edit")} onDeleted={onClose} /> : null}
        {view === "edit" ? (
          <div className="space-y-4">
            <button type="button" className="text-sm text-blue-ink underline" onClick={() => setView("details")}>
              ← Retour aux détails
            </button>
            <EditOrderForm order={order} onDone={() => setView("details")} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Ce que dit la pastille choisie : les actions si c'est l'étape en cours, sinon un constat.
const EXIT_TEXT: Partial<Record<AdminOrder["status"], string>> = {
  cancelled: "Cette commande a été annulée. Le stock de chaque article est revenu.",
  returned: "Le colis est revenu : le stock est remis en vente et les frais de retour sont comptés dans l'historique.",
  expired: "Le client n'est pas venu à temps : la réservation a expiré et le stock est revenu.",
};

const FINISHED_TEXT: Partial<Record<AdminOrder["status"], string>> = {
  collected: "L'argent de cette livraison est arrivé. Il est compté dans l'historique, onglet Livraisons.",
  picked_up: "Le client est venu : le paiement est entré dans la caisse du jour.",
};

function StepPanel({ order, step, steps }: { order: AdminOrder; step: OrderStep; steps: OrderStep[] }) {
  if (step.state === "current") return <StepActions order={order} />;

  if (step.state === "exit") return <p>{EXIT_TEXT[order.status] ?? STATUS_LABELS[order.status]}</p>;

  if (step.state === "done") {
    const finished = step.status === order.status;
    return <p className="text-ink-muted">{finished ? (FINISHED_TEXT[order.status] ?? "Étape terminée.") : "Étape terminée."}</p>;
  }

  // Une étape à venir : on dit où en est la commande (une commande sortie n'avance plus).
  const current = steps.find((other) => other.state === "current");
  return (
    <p className="text-ink-muted">
      {current ? `Pas encore : la commande est à l'étape « ${current.label} ». Celle-ci viendra ensuite.` : "Cette commande est sortie du circuit : elle n'avancera plus."}
    </p>
  );
}
