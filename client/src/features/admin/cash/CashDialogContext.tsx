"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import EditDialog from "@/features/admin/products/EditDialog";
import CashPanel from "./CashPanel";

// La caisse est une fenêtre qu'on ouvre de partout (23/11, demande de Mehdi), comme le bouton de thème : le bouton de
// la barre du haut, le tableau de bord et les messages « il faut ouvrir la journée » appellent tous `openCash`.
// Une seule fenêtre, montée dans la mise en page du back-office : elle survit au changement de page. On retient donc la
// page où elle a été ouverte : dès que l'adresse change, elle est fermée (sans effet, qui ferait un rendu de plus).
type CashDialog = { openCash: () => void };

const CashDialogContext = createContext<CashDialog | null>(null);

export function CashDialogProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const openCash = useCallback(() => setOpenOn(pathname), [pathname]);
  const close = useCallback(() => setOpenOn(null), []);
  const value = useMemo(() => ({ openCash }), [openCash]);

  return (
    <CashDialogContext.Provider value={value}>
      {children}
      {/* Le contenu n'est monté que fenêtre ouverte : la caisse n'est relue (toutes les 60 s) que quand on la regarde. */}
      <EditDialog open={open} title="Caisse" onClose={close}>
        <CashPanel onNavigate={close} />
      </EditDialog>
    </CashDialogContext.Provider>
  );
}

export function useCashDialog(): CashDialog {
  const context = useContext(CashDialogContext);
  if (!context) throw new Error("useCashDialog doit être utilisé dans CashDialogProvider");
  return context;
}

// Un bouton qui ouvre la fenêtre de la caisse : pour les messages « Ouvrir la caisse » et le tableau de bord, qui
// étaient des liens vers l'ancienne page.
export function OpenCashButton({ className, children }: { className?: string; children: ReactNode }) {
  const { openCash } = useCashDialog();
  return (
    <button type="button" className={className} onClick={openCash}>
      {children}
    </button>
  );
}
