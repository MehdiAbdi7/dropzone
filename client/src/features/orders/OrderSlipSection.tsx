"use client";

import { useState } from "react";
import type { OrderDetail } from "@/types/api";
import OrderSlip from "./OrderSlip";
import { drawSlip, saveSlip } from "./slipImage";
import { slipRows } from "./slipRows";

// Le bon de commande et ses boutons (lot 6), à deux endroits : la page de confirmation juste après la commande, et
// la page « Suivi » (aussi l'espace client), pour le retélécharger quand on veut.
//  - « Télécharger le bon (image) » : une image PNG, qui marche sur téléphone (feuille de partage ou
//    téléchargement). L'image s'affiche aussi dessous : si rien ne démarre (navigateur intégré à une
//    application), on appuie longuement dessus pour l'enregistrer.
//  - « Imprimer ou PDF » : la fenêtre d'impression du navigateur (ordinateur), où « Enregistrer en PDF »
//    le télécharge.
export default function OrderSlipSection({ order }: { order: OrderDetail }) {
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setError(null);
    try {
      setImage(await saveSlip(drawSlip(slipRows(order)), `bon-de-commande-${order.number}.png`));
    } catch {
      setError("L'image n'a pas pu être créée : faites plutôt une capture d'écran du bon.");
    }
  }

  return (
    <section aria-labelledby={`slip-title-${order.number}`} className="space-y-3">
      <h2 id={`slip-title-${order.number}`} className="text-xl">
        Votre bon de commande
      </h2>
      <p className="no-print rounded-lg border border-line bg-surface-2 p-4 text-sm">
        <strong>Gardez ce bon.</strong> Téléchargez-le avec le bouton ci-dessous, ou faites-en une capture d&apos;écran avec votre
        téléphone : il suffit pour retrouver votre commande.
      </p>
      <OrderSlip order={order} />
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
          <img src={image} alt={`Bon de commande n° ${order.number}, en image`} className="mx-auto w-full max-w-[148mm] rounded-lg border border-line" />
        </div>
      ) : null}
    </section>
  );
}
