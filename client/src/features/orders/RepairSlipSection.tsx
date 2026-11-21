"use client";

import { useState } from "react";
import PrintCopy from "@/components/ui/PrintCopy";
import { repairSlipRows, type RepairTracking } from "./repairTrack";
import { drawSlip, saveSlip } from "./slipImage";
import type { SlipRows } from "./slipRows";

// Le papier du bon de réparation (21/11) : posé deux fois, à l'écran et dans une copie réservée à l'impression (voir
// PrintCopy). Le texte vient de `repairSlipRows` (testé), le même que l'image : papier blanc et texte noir quel que
// soit le thème.
function Slip({ rows }: { rows: SlipRows }) {
  return (
    <article aria-label={`Bon de réparation ${rows.number}`} className="mx-auto w-full max-w-[148mm] space-y-4 rounded-lg border border-neutral-300 bg-white p-5 text-sm text-black">
      <header className="grid grid-cols-[1fr_auto] items-start gap-4 border-b border-neutral-300 pb-3">
        <div>
          <p className="text-xl font-extrabold">{rows.shop}</p>
          <p className="text-neutral-700">{rows.city}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold tracking-wide">{rows.title}</p>
          <p className="text-base font-bold">{rows.number}</p>
          <p className="text-neutral-700">{rows.date}</p>
        </div>
      </header>

      <p className="font-semibold">{rows.where}</p>

      <ul className="divide-y divide-neutral-200">
        {rows.items.map((item) => (
          // Une grille à deux colonnes : le prix reste à droite, même quand le nom est long.
          <li key={item.title} className="grid grid-cols-[1fr_auto] items-start gap-4 py-2">
            <p className="min-w-0 font-semibold">{item.title}</p>
            <p className="whitespace-nowrap text-right font-semibold tabular-nums">{item.price}</p>
          </li>
        ))}
      </ul>

      <div className="space-y-1 border-t border-neutral-400 pt-3">
        <p className="grid grid-cols-[1fr_auto] gap-4 text-base font-extrabold">
          <span>Total</span>
          <span className="whitespace-nowrap text-right tabular-nums">{rows.total}</span>
        </p>
        <p className="text-xs text-neutral-700">{rows.payNote}</p>
      </div>

      <p className="border-t border-neutral-300 pt-3 text-xs text-neutral-700">{rows.footer}</p>
    </article>
  );
}

// Le bon de réparation et ses boutons, sur la page « Suivi », une fois le devis accepté : le même geste que le bon de
// commande, l'image à enregistrer sur le téléphone, ou l'impression et le PDF sur ordinateur.
export default function RepairSlipSection({ tracking }: { tracking: RepairTracking }) {
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rows = repairSlipRows(tracking);

  async function download() {
    setError(null);
    try {
      setImage(await saveSlip(drawSlip(rows), `bon-de-reparation-R-${tracking.number}.png`));
    } catch {
      setError("L'image n'a pas pu être créée : faites plutôt une capture d'écran du bon.");
    }
  }

  return (
    <section aria-labelledby="repair-slip-title" className="space-y-3">
      <h2 id="repair-slip-title" className="text-xl">
        Votre bon de réparation
      </h2>
      <p className="no-print rounded-lg border border-line bg-surface-2 p-4 text-sm">
        <strong>Gardez ce bon.</strong> Téléchargez-le avec le bouton ci-dessous, ou faites-en une capture d&apos;écran : il vous servira à
        récupérer votre appareil.
      </p>
      <div className="no-print">
        <Slip rows={rows} />
      </div>
      <PrintCopy>
        <Slip rows={rows} />
      </PrintCopy>
      <div className="no-print flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={download}>
          Télécharger le bon (image)
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
          Imprimer ou PDF
        </button>
      </div>
      {error ? (
        <p role="alert" className="no-print field-error">
          {error}
        </p>
      ) : null}
      {image ? (
        <div className="no-print space-y-2">
          <p className="text-sm text-ink-muted">Si le téléchargement ne démarre pas, appuyez longuement sur l&apos;image pour l&apos;enregistrer.</p>
          {/* Une image créée dans le navigateur (data:) : next/image n'a rien à optimiser ici. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={`Bon de réparation ${rows.number}, en image`} className="mx-auto w-full max-w-[148mm] rounded-lg border border-line" />
        </div>
      ) : null}
    </section>
  );
}
