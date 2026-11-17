"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { canAccess, homeFor } from "./access";
import { useAdminRole } from "./AdminRoleContext";

// Une page du back-office qui n'est pas pour ce rôle (une adresse tapée à la main, un vieux favori) renvoie
// sur sa première page, sans jamais l'afficher : elle ferait des appels que l'API refuserait de toute façon.
export default function AdminGuard({ children }: { children: ReactNode }) {
  const role = useAdminRole();
  const router = useRouter();
  const path = usePathname();
  const allowed = canAccess(role, path);

  useEffect(() => {
    if (!allowed) router.replace(homeFor(role));
  }, [allowed, role, router]);

  return allowed ? children : null;
}
