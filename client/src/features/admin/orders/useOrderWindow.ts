"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// La commande ouverte dans la fenêtre vit dans l'adresse (`?commande=12`) : on peut partager le lien,
// recharger la page ou revenir sans perdre la commande. Les autres réglages de la page (état, onglet,
// période) sont gardés tels quels. À utiliser dans un composant sous <Suspense>.
export function useOrderWindow() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const asked = Number(params.get("commande"));
  const id = Number.isInteger(asked) && asked > 0 ? asked : null;

  function go(next: number | null) {
    const query = new URLSearchParams(params.toString());
    if (next === null) query.delete("commande");
    else query.set("commande", String(next));
    const text = query.toString();
    // `replace` : ouvrir et fermer des commandes n'empile pas l'historique du navigateur.
    router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false });
  }

  return { id, open: (orderId: number) => go(orderId), close: () => go(null) };
}
