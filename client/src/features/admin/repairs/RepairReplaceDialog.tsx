"use client";

import { useState, type ReactNode } from "react";
import { PAYMENT_METHOD_LABELS } from "@/config/catalog";
import { useReplaceRepairMutation, type RepairDetail } from "@/features/admin/api/repairsApi";
import { differenceText, emptyTradeIn } from "@/features/admin/exchange/exchange";
import TradeInForm from "@/features/admin/exchange/TradeInForm";
import EditDialog from "@/features/admin/products/EditDialog";
import ShopPicker from "@/features/admin/sales/ShopPicker";
import type { VariantHit } from "@/features/admin/sales/ticket";
import { errorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/format";
import type { PaymentMethod } from "@/types/api";
import { givenModelMatches, replaceDifference, replaceProblem, buildReplaceBody, type ReplaceOrigin } from "./replaceRules";
import { repairNumber } from "./repairsView";

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

// Un bouton qui ouvre une fenêtre, avec un point rouge tant qu'elle n'est pas remplie (comme la vente au comptoir).
function WindowButton({ onClick, done, children }: { onClick: () => void; done: boolean; children: ReactNode }) {
  return (
    <button type="button" className="btn btn-secondary btn-small gap-2" onClick={onClick}>
      <span aria-hidden="true" className={`inline-block size-2.5 rounded-full ${done ? "bg-emerald-500" : "bg-red"}`} />
      {children}
      <span className="sr-only">{done ? " (rempli)" : " (à remplir)"}</span>
    </button>
  );
}

// « Remplacer l'appareil » (étape 6, cahier §7) : l'appareil est irréparable sous garantie. Le magasin donne un autre
// appareil, laisse l'appareil en panne (qui entre dans les Reprises à 0 DA) et la fiche est rendue. Même modèle : le
// client ne paie rien ; autre modèle : on compare avec le prix PAYÉ à l'origine. Une fois fait, rien ne s'annule.
export default function RepairReplaceDialog({ open, repair, onClose }: { open: boolean; repair: RepairDetail; onClose: () => void }) {
  return (
    <EditDialog open={open} title={`Remplacer l'appareil de ${repairNumber(repair.number)}`} size="lg" onClose={onClose} closeLabel="Annuler">
      <ReplaceBody repair={repair} onDone={onClose} />
    </EditDialog>
  );
}

// Monté seulement fenêtre ouverte : chaque ouverture repart d'une saisie vierge.
function ReplaceBody({ repair, onDone }: { repair: RepairDetail; onDone: () => void }) {
  const [openWindow, setOpenWindow] = useState<"given" | "broken" | null>(null);
  const [given, setGiven] = useState<VariantHit | null>(null);
  const [tradeIn, setTradeIn] = useState(() => emptyTradeIn());
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [replace, { isLoading, error }] = useReplaceRepairMutation();

  // Le bouton n'est proposé que pour une fiche qui a sa vente d'origine (`canReplace`) : `origin` existe.
  const origin: ReplaceOrigin = { unitPrice: repair.origin?.unitPrice ?? 0, productId: repair.origin?.productId ?? null, storage: repair.origin?.storage ?? null };
  const difference = given ? replaceDifference(origin, given) : null;
  const sameModel = given ? givenModelMatches(origin, given) : false;
  const problem = replaceProblem({ origin, given, tradeIn, method, acceptLimitations: accepted });

  async function submit() {
    if (problem || !given) return;
    try {
      // « Espèces » quand la différence est nulle : le serveur écrit quand même le mouvement à 0 DA.
      await replace({ id: repair.id, body: buildReplaceBody({ sku: given.sku, method: method ?? "cash", acceptLimitations: accepted, tradeIn }) }).unwrap();
      onDone();
    } catch {
      // L'erreur RTK Query est affichée sous le bouton (caisse fermée, stock épuisé…) ; la fenêtre reste ouverte.
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        {repairNumber(repair.number)} est irréparable : le magasin donne un autre appareil et garde celui-ci. La garantie du nouvel appareil finit à la même date que
        l&apos;ancienne.
      </p>

      <div className="flex flex-wrap gap-2">
        <WindowButton onClick={() => setOpenWindow("given")} done={given !== null}>
          Appareil donné
        </WindowButton>
        <WindowButton onClick={() => setOpenWindow("broken")} done={tradeIn.model !== null}>
          Appareil en panne
        </WindowButton>
      </div>

      {given ? (
        <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm">
          <p className="font-semibold">{given.productName}</p>
          <p className="text-ink-muted">{Object.values(given.options).join(" · ") || "Sans option"} · {formatPrice(given.price)} au catalogue</p>
        </div>
      ) : null}

      {difference !== null ? (
        <div className="space-y-1 rounded-lg border border-line p-3">
          <p className="font-display text-xl font-bold">{differenceText(difference)}</p>
          <p className="text-sm text-ink-muted">
            {sameModel
              ? "Même modèle : le client ne paie rien, quel que soit le prix d'aujourd'hui."
              : `Autre modèle : comparé au prix payé à l'achat (${formatPrice(origin.unitPrice)}), pas au prix catalogue.`}
          </p>
        </div>
      ) : null}

      {difference !== null && difference !== 0 ? (
        <fieldset>
          <legend className="label">Moyen de paiement de la différence</legend>
          <div className="flex flex-wrap gap-2">
            {METHODS.map((value) => (
              <button key={value} type="button" className="chip" aria-pressed={method === value} onClick={() => setMethod(value)}>
                {PAYMENT_METHOD_LABELS[value]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-sm text-ink-muted">L&apos;argent entre dans la caisse du jour : elle doit être ouverte.</p>
        </fieldset>
      ) : null}

      {given && given.limitations.length > 0 ? (
        <div className="space-y-2">
          <ul className="list-disc pl-5 text-sm">
            {given.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
          <label className="flex items-start gap-2 font-semibold">
            <input type="checkbox" className="mt-1 size-5" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
            <span>Le client a pris connaissance de ces limitations et les accepte.</span>
          </label>
        </div>
      ) : null}

      <p className="text-sm text-ink-muted">
        Une fois validé, la fiche est rendue et le remplacement ne s&apos;annule pas. L&apos;appareil en panne entre dans les Reprises à 0 DA.
      </p>
      {problem ? <p className="text-sm text-ink-muted">{problem}</p> : null}
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={isLoading || problem !== null} onClick={submit}>
        {isLoading ? "Enregistrement…" : "Remplacer l'appareil"}
      </button>

      <EditDialog open={openWindow === "given"} title="Appareil donné par le magasin" onClose={() => setOpenWindow(null)}>
        <ShopPicker
          onPick={(hit) => {
            setGiven(hit);
            setAccepted(false);
            setOpenWindow(null);
          }}
        />
      </EditDialog>
      <EditDialog open={openWindow === "broken"} title="Appareil en panne laissé au magasin" onClose={() => setOpenWindow(null)}>
        <TradeInForm draft={tradeIn} onChange={setTradeIn} noPrice />
      </EditDialog>
    </div>
  );
}
