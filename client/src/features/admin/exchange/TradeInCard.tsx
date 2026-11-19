"use client";

import { useState, type FormEvent } from "react";
import { usePublishTradeInMutation, useUpdateTradeInMutation, type TradeInRow } from "@/features/admin/api/exchangeApi";
import EditDialog from "@/features/admin/products/EditDialog";
import { errorMessage } from "@/lib/errors";
import { formatOptions, formatPrice } from "@/lib/format";
import { repairNumber } from "@/features/admin/repairs/repairsView";
import { tradeInProblem, type TradeInDraft } from "./exchange";
import TradeInForm from "./TradeInForm";
import { DismantleDialog, UsePartDialog } from "./TradeInPartsDialogs";
import { buildTradeInUpdateBody, marginText, repairCostOf, resaleProblem, resalePrice, sheetSummary, tradeInToDraft } from "./tradeInView";

const dayLabel = (iso: string) => {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

// Une reprise du client (lot 5) : son téléphone, ce que le magasin lui a donné, et deux boutons (refonte du 18/11) :
// « Modifier la fiche » (le téléphone a été remis en état : batterie neuve, écran… la fiche le dit et les frais
// s'ajoutent au prix d'achat) et « Mettre en vente » (le prix de revente, fixé par l'admin). Chacun ouvre sa fenêtre.
export default function TradeInCard({ tradeIn, onPublished }: { tradeIn: TradeInRow; onPublished: (name: string) => void }) {
  const [open, setOpen] = useState<"edit" | "publish" | "usePart" | "dismantle" | null>(null);
  const pending = tradeIn.listedAt === null;
  const options = { ...tradeIn.sheet.options, Couleur: tradeIn.color };
  const name = `${tradeIn.deviceModel.brand} ${tradeIn.deviceModel.name}`;
  const close = () => setOpen(null);

  return (
    <li className="card space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl">{name}</h2>
          <p className="text-sm text-ink-muted">{formatOptions(options)}</p>
          {/* Étape 6 : un appareil en panne laissé par un remplacement sous garantie (réparation R-…), repris à 0 DA. */}
          {tradeIn.repairNumber !== null ? (
            <p className="mt-1 inline-block rounded-full bg-blue-soft px-2.5 py-0.5 text-xs font-bold">Remplacement sous garantie · {repairNumber(tradeIn.repairNumber)}</p>
          ) : null}
        </div>
        <p className="font-display text-lg font-bold tabular-nums">Repris à {formatPrice(tradeIn.price)}</p>
      </div>
      <p className="text-sm">{sheetSummary(tradeIn.sheet) || "Fiche d'état sans détail"}</p>
      {tradeIn.repairCost > 0 ? <p className="text-sm font-semibold">Remise en état : {formatPrice(tradeIn.repairCost)}</p> : null}
      <p className="text-sm text-ink-muted">
        Échange n° {tradeIn.dailyNumber} du {dayLabel(tradeIn.businessDate)} · {tradeIn.customerName} · {tradeIn.customerPhone}
      </p>

      {pending ? (
        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          <button type="button" className="btn btn-secondary" onClick={() => setOpen("edit")}>
            Modifier la fiche
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setOpen("usePart")}>
            Utiliser une pièce
          </button>
          {tradeIn.dismantlable ? (
            <button type="button" className="btn btn-secondary" onClick={() => setOpen("dismantle")}>
              Démonter pour pièces
            </button>
          ) : null}
          <button type="button" className="btn btn-primary" onClick={() => setOpen("publish")}>
            Mettre en vente
          </button>
          <UsePartDialog open={open === "usePart"} tradeIn={tradeIn} onClose={close} />
          <DismantleDialog open={open === "dismantle"} tradeIn={tradeIn} onClose={close} />
          <EditDialog open={open === "edit"} title={`Modifier la fiche : ${name}`} onClose={close} closeLabel="Annuler">
            <EditForm tradeIn={tradeIn} onDone={close} />
          </EditDialog>
          <EditDialog open={open === "publish"} title={`Mettre en vente : ${name}`} size="sm" onClose={close} closeLabel="Annuler">
            <PublishForm
              tradeIn={tradeIn}
              onDone={() => {
                close();
                onPublished(name);
              }}
            />
          </EditDialog>
        </div>
      ) : (
        <p className="border-t border-line pt-3 text-sm font-semibold">
          En vente depuis le {tradeIn.listedAt ? dayLabel(tradeIn.listedAt.slice(0, 10)) : ""}.
        </p>
      )}
    </li>
  );
}

// Modifier la fiche d'état de la reprise (batterie, pièces changées, défauts, garantie…) et les frais de remise en état.
function EditForm({ tradeIn, onDone }: { tradeIn: TradeInRow; onDone: () => void }) {
  const [draft, setDraft] = useState<TradeInDraft>(() => tradeInToDraft(tradeIn));
  const [save, { isLoading, error }] = useUpdateTradeInMutation();
  const repair = repairCostOf(draft.repairCost);
  const problem = tradeInProblem(draft) ?? (Number.isNaN(repair) ? "Les frais de remise en état : un nombre entier de dinars." : null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem) return;
    try {
      await save({ id: tradeIn.id, body: buildTradeInUpdateBody(draft) }).unwrap();
      onDone();
    } catch {
      // L'erreur RTK Query est affichée sous le bouton ; la fiche reste telle quelle.
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <TradeInForm draft={draft} onChange={setDraft} editing />
      {problem ? <p className="text-sm text-ink-muted">{problem}</p> : null}
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={isLoading || problem !== null}>
        {isLoading ? "Enregistrement…" : "Enregistrer la fiche"}
      </button>
    </form>
  );
}

// Le prix de revente, fixé par l'admin. La marge compte le prix de reprise ET les frais de remise en état.
function PublishForm({ tradeIn, onDone }: { tradeIn: TradeInRow; onDone: () => void }) {
  const [price, setPrice] = useState("");
  const [publish, { isLoading, error }] = usePublishTradeInMutation();
  const problem = resaleProblem(price);
  const cost = tradeIn.price + tradeIn.repairCost;
  const margin = marginText(resalePrice(price), cost);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem) return;
    try {
      await publish({ id: tradeIn.id, price: resalePrice(price) }).unwrap();
      onDone();
    } catch {
      // L'erreur RTK Query est affichée sous le champ ; la reprise reste dans la liste.
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-ink-muted">
        Prix d&apos;achat de l&apos;affaire : {formatPrice(cost)}
        {tradeIn.repairCost > 0 ? ` (reprise ${formatPrice(tradeIn.price)} + remise en état ${formatPrice(tradeIn.repairCost)})` : ""}.
      </p>
      <label className="block text-sm font-semibold">
        <span className="label">Prix de revente (DA)</span>
        <input
          className="input w-full"
          inputMode="numeric"
          aria-label="Prix de revente"
          value={price}
          onChange={(event) => setPrice(event.target.value.replace(/\D/g, ""))}
        />
      </label>
      {margin ? (
        <p className="text-sm font-semibold" aria-live="polite">
          {margin}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={isLoading || problem !== null}>
        {isLoading ? "Mise en vente…" : "Mettre en vente"}
      </button>
    </form>
  );
}
