import { type KeyboardEvent, type RefObject, useCallback, useEffect } from "react";
import { moveIndex } from "./series";

// La fermeture et le clavier d'une liste de choix ouverte sous un bouton (la capsule de filtres et
// les étapes du parcours d'achat, 25/11). Écrit une fois pour que les deux se comportent pareil.
//
// - À l'ouverture, le focus va sur la ligne marquée `data-current` (le choix actuel) : le clavier
//   part de là.
// - Échap ferme et rend le focus au bouton ; ↑ et ↓ passent d'une ligne à l'autre.
// - Liste sous le bouton (`popover`) : un clic en dehors ferme, et Tab ferme aussi. Sans cela, le
//   focus sortait de la liste qui restait ouverte par-dessus la page. Le focus est rendu au bouton
//   avant que Tab n'agisse : il passe alors à l'élément qui suit le bouton.
// - Feuille du bas (`popover` faux) : elle a son fond cliquable, ni clic en dehors ni Tab ici.
// Les lignes sont des boutons ou des liens.
export function useListDismiss({
  open,
  popover,
  rootRef,
  triggerRef,
  listRef,
  setOpen,
}: {
  open: boolean;
  popover: boolean;
  rootRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
  listRef: RefObject<HTMLElement | null>;
  setOpen: (open: boolean) => void;
}) {
  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, [setOpen, triggerRef]);

  useEffect(() => {
    if (open) {
      listRef.current?.querySelector<HTMLElement>("[data-current]")?.focus();
    }
  }, [open, listRef]);

  useEffect(() => {
    if (!open || !popover) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, popover, rootRef, setOpen]);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Tab" && popover) {
      close();
      return;
    }
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>("button, a[href]") ?? []);
    const current = rows.indexOf(document.activeElement as HTMLElement);
    if (current === -1) {
      return;
    }
    event.preventDefault();
    rows[moveIndex(current, rows.length, event.key === "ArrowDown" ? 1 : -1)]?.focus();
  }

  return { close, onKeyDown };
}
