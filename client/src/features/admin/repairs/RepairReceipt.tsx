"use client";

import PrintCopy from "@/components/ui/PrintCopy";
import type { RepairDetail } from "@/features/admin/api/repairsApi";
import { formatDate } from "@/lib/format";
import { repairNumber, warrantyLabel } from "./repairsView";

// Le bon de dépôt (18/11, étape 2) : le papier remis au client quand il laisse son appareil. Numéro, client,
// téléphone, appareil, panne, accessoires laissés, garantie, et la place de la signature. Aucun prix. Il est posé
// dans une copie réservée à l'impression (PrintCopy) : le bouton ne montre rien à l'écran, il lance l'impression.
function Sheet({ repair }: { repair: RepairDetail }) {
  const received = repair.events.find((event) => event.status === "received")?.createdAt ?? repair.createdAt;
  const rows: [string, string][] = [
    ["Client", repair.fullName],
    ["Téléphone", repair.phone],
    ["Appareil", repair.deviceName],
    ["Couleur", repair.deviceColor ?? "Non précisée"],
    ["État à l'arrivée", repair.deviceState ?? "Non précisé"],
    ["Panne décrite", repair.issue],
    ["Accessoires laissés", repair.accessories ?? "Aucun"],
    ["Garantie", warrantyLabel(repair)],
  ];
  return (
    <article className="space-y-4 p-6 text-sm text-black">
      <header className="flex items-start justify-between gap-4 border-b border-neutral-400 pb-3">
        <div>
          <p className="text-xl font-bold">DropZone</p>
          <p>Bon de dépôt</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{repairNumber(repair.number)}</p>
          <p>{formatDate(received)}</p>
        </div>
      </header>
      <dl className="space-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[10rem_1fr] gap-2">
            <dt className="font-semibold">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs">
        Présentez ce bon pour récupérer votre appareil. Le magasin n&apos;est pas responsable des données de l&apos;appareil : sauvegardez-les
        avant le dépôt.
      </p>
      <p className="pt-8">Signature du client : ______________________</p>
    </article>
  );
}

export default function RepairReceipt({ repair }: { repair: RepairDetail }) {
  return (
    <>
      <button type="button" className="btn btn-secondary btn-small" onClick={() => window.print()}>
        Imprimer le bon de dépôt
      </button>
      <PrintCopy>
        <Sheet repair={repair} />
      </PrintCopy>
    </>
  );
}
