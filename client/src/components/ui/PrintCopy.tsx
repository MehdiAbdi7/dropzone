"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const noop = () => () => {};

// La copie d'un document qui s'imprime (facture, bon de commande). Elle est posée directement dans <body>,
// invisible à l'écran, et c'est la SEULE chose visible à l'impression (voir styles/print.css). Avant, on
// cachait tout le reste de la page ; mais ce qui est caché garde sa place, et le document s'imprimait avec un
// grand vide en haut et coupé sur deux feuilles. Ici, rien d'autre n'existe à l'impression : le document
// part du haut de la page et se coupe proprement. Rien côté serveur : le portail se monte dans le navigateur.
export default function PrintCopy({ children }: { children: ReactNode }) {
  const body = useSyncExternalStore(
    noop,
    () => document.body,
    () => null,
  );
  return body ? createPortal(<div className="print-only">{children}</div>, body) : null;
}
