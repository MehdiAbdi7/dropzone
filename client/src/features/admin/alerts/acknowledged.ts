import { useSyncExternalStore } from "react";
import { parseAcknowledged } from "./alertLogic";

// Les commandes marquées « Vu » sur CET appareil, gardées dans le navigateur : un rechargement ne
// refait pas sonner ce qu'on a déjà vu, et chaque appareil (comptoir, téléphone) a ses propres « Vu ».
// Un petit magasin extérieur à React (comme l'état du son) : le bouton « Vu » de la bannière et
// l'ouverture d'une commande l'alimentent depuis n'importe où.
const STORAGE_KEY = "dropzone_acknowledged_orders";
const NONE: number[] = [];

let current: number[] | null = null;
const listeners = new Set<() => void>();

function read(): number[] {
  if (current === null) {
    try {
      current = parseAcknowledged(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      // Stockage indisponible (navigation privée) : les « Vu » tiennent jusqu'au rechargement.
      current = [];
    }
  }
  return current;
}

// Relit le stockage : un autre onglet du même navigateur a pu marquer des commandes « Vu » depuis la
// dernière lecture. Sans cela, cet onglet continuerait de sonner, et un « Vu » d'ici effacerait celui de
// l'autre onglet (on réécrirait une liste périmée).
function reload() {
  try {
    const stored = parseAcknowledged(window.localStorage.getItem(STORAGE_KEY));
    // Même contenu : on garde le même tableau. Un nouveau tableau à chaque lecture ferait croire à
    // React que la liste a changé (useSyncExternalStore compare les références) et relancerait les
    // effets qui en dépendent, en boucle.
    if (JSON.stringify(stored) !== JSON.stringify(current)) current = stored;
  } catch {
    // Stockage indisponible : on garde la liste en mémoire.
  }
}

// Un « Vu » fait dans un autre onglet arrive ici par l'événement `storage` (il ne se déclenche que
// dans les AUTRES onglets, jamais dans celui qui a écrit).
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    reload();
    listeners.forEach((listener) => listener());
  });
}

function write(ids: number[]) {
  current = ids;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Stockage plein ou refusé : pas de quoi bloquer l'alerte.
  }
  listeners.forEach((listener) => listener());
}

// Marque des commandes « Vu ».
export function acknowledge(ids: number[]) {
  reload();
  const known = new Set(read());
  const added = ids.filter((id) => !known.has(id));
  if (added.length > 0) write([...read(), ...added]);
}

// Ne garde que les « Vu » de ces commandes (celles encore en attente).
export function keepOnly(ids: number[]) {
  reload();
  const wanted = new Set(ids);
  const kept = read().filter((id) => wanted.has(id));
  if (kept.length !== read().length) write(kept);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Côté serveur, rien n'est vu : la liste vide, toujours la même (référence stable).
export function useAcknowledged(): number[] {
  return useSyncExternalStore(subscribe, read, () => NONE);
}
