"use client";

import Link from "next/link";
import { use } from "react";
import { useInvoiceQuery } from "@/features/admin/api/invoiceApi";
import InvoiceSheet from "@/features/admin/invoice/InvoiceSheet";
import { errorMessage } from "@/lib/errors";

// La facture d'une commande (lot 6, 15/11) : préremplie avec toutes les infos de la commande et son type.
// « Imprimer » ouvre la fenêtre d'impression du navigateur, où « Enregistrer en PDF » la télécharge : pas de
// bibliothèque PDF. La première ouverture attribue le numéro (F-2026-0001…), il ne change plus ensuite.
// Quand la facture n'est pas encore possible (livraison pas confirmée, retrait pas récupéré…), l'API le dit.
export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const orderId = Number(id);
  const { data, error, isLoading } = useInvoiceQuery(orderId, { skip: !Number.isInteger(orderId) || orderId < 1 });

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Link href="/admin/historique" className="btn btn-secondary">
          ← Retour
        </Link>
        <button type="button" className="btn btn-primary" disabled={!data} onClick={() => window.print()}>
          Imprimer ou enregistrer en PDF
        </button>
        {data ? <p className="text-sm text-ink-muted">Dans la fenêtre qui s&apos;ouvre, choisissez « Enregistrer en PDF » pour la télécharger.</p> : null}
      </div>
      {isLoading ? <p className="text-ink-muted">Préparation de la facture…</p> : null}
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      {data ? <InvoiceSheet invoice={data} /> : null}
    </div>
  );
}
