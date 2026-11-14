"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAdminOrderQuery } from "@/features/admin/api/ordersApi";
import { ordersListHref } from "@/features/admin/navConfig";

// L'ancienne page de détail d'une commande. La commande s'ouvre maintenant dans une fenêtre sur sa
// liste (`?commande=12`) ; cette adresse reste valable (tableau de bord, caisse, alertes, anciens
// liens) et mène à la bonne liste avec la fenêtre ouverte.
export default function AdminOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: order, isError } = useAdminOrderQuery(Number(id));

  useEffect(() => {
    if (!order) return;
    const list = ordersListHref(order.type);
    router.replace(`${list}${list.includes("?") ? "&" : "?"}commande=${order.id}`);
  }, [order, router]);

  if (isError) return <p role="alert">Cette commande est introuvable.</p>;
  return <p className="text-ink-muted">Ouverture de la commande…</p>;
}
