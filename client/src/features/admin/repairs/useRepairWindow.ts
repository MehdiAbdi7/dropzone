"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// La fiche ouverte dans la fenêtre vit dans l'adresse (`?reparation=12`), comme les commandes : on peut recharger
// la page ou partager le lien sans perdre la fiche. À utiliser dans un composant sous <Suspense>.
export function useRepairWindow() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const asked = Number(params.get("reparation"));
  const id = Number.isInteger(asked) && asked > 0 ? asked : null;

  function go(next: number | null) {
    const query = new URLSearchParams(params.toString());
    if (next === null) query.delete("reparation");
    else query.set("reparation", String(next));
    const text = query.toString();
    // `replace` : ouvrir et fermer des fiches n'empile pas l'historique du navigateur.
    router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false });
  }

  return { id, open: (repairId: number) => go(repairId), close: () => go(null) };
}
