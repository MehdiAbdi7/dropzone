"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { STORE_INFO } from "@/config/storeInfo";
import { formatPrice } from "@/lib/format";

type LastOrder = { number: number; total: number };

// La dernière commande, gardée dans sessionStorage par le formulaire. Lue avec
// useSyncExternalStore : rien côté serveur, la valeur réelle côté navigateur.
function readLastOrder(): string | null {
  try {
    return sessionStorage.getItem("dropzone-last-order");
  } catch {
    return null;
  }
}

export default function ConfirmationView({ number }: { number: string | undefined }) {
  const raw = useSyncExternalStore(
    () => () => {},
    readLastOrder,
    () => null,
  );
  const last = raw ? (JSON.parse(raw) as LastOrder) : null;
  const total = last && String(last.number) === number ? last.total : null;

  return (
    <div className="card max-w-2xl space-y-5 p-6 sm:p-8">
      <p className="font-display text-sm font-bold text-blue-ink">Commande enregistrée</p>
      <h1 className="text-3xl">Merci, votre commande n° {number ?? "?"} est reçue.</h1>
      {total !== null ? (
        <p>
          Montant à payer à la livraison : <strong className="font-display text-xl">{formatPrice(total)}</strong>
        </p>
      ) : null}
      <p className="text-ink-muted">{STORE_INFO.confirmation}</p>
      <p className="text-ink-muted">Gardez ce numéro : avec votre téléphone, il permet de suivre la commande.</p>
      <div className="flex flex-wrap gap-3">
        <Link href={`/suivi?numero=${number ?? ""}`} className="btn btn-primary">
          Suivre ma commande
        </Link>
        <Link href="/produits" className="btn btn-secondary">
          Continuer mes achats
        </Link>
      </div>
    </div>
  );
}
