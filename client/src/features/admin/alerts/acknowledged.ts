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
  const known = new Set(read());
  const added = ids.filter((id) => !known.has(id));
  if (added.length > 0) write([...read(), ...added]);
}

// Ne garde que les « Vu » de ces commandes (celles encore en attente).
export function keepOnly(ids: number[]) {
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
