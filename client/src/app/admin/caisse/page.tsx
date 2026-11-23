"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { homeFor } from "@/features/admin/access";
import { useAdminRole } from "@/features/admin/AdminRoleContext";

// L'ancienne page Caisse (avant le 23/11) : la caisse est maintenant une fenêtre, qu'on ouvre avec le bouton de la barre
// du haut. Un favori ou un vieux lien renvoie sur la première page du rôle.
export default function CashRedirect() {
  const router = useRouter();
  const role = useAdminRole();
  useEffect(() => {
    router.replace(homeFor(role));
  }, [router, role]);
  return <p className="text-ink-muted">La caisse s&apos;ouvre avec le bouton de la barre du haut…</p>;
}
