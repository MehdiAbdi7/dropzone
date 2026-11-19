"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { homeFor } from "./access";
import { initialsOf, roleLabel } from "./adminIdentity";
import AdminNav from "./AdminNav";
import { useAdminRole } from "./AdminRoleContext";
import { ACCOUNT_HREF } from "./navConfig";

// La barre latérale du back-office, sur ordinateur (19/11) : le logo, qui est connecté (un lien vers « Mon
// compte »), puis les sections permises au rôle. Collée à l'écran pendant le défilement, avec son propre
// défilement si les sections dépassent. Sur téléphone et tablette, la navigation est dans la barre du bas.
// La carte de la personne connectée est en HAUT : en bas, le bandeau « démo » au-dessus de la page la coupait.
export default function AdminSidebar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const role = useAdminRole();
  return (
    <aside className="admin-sidebar hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:self-start">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Logo href={homeFor(role)} size="text-xl" />
      </div>
      <Link
        href={ACCOUNT_HREF}
        className="mx-3 mb-2 flex items-center gap-3 rounded-xl border border-[var(--admin-line)] bg-surface-2/60 p-2.5 transition-colors hover:bg-surface-2"
      >
        <span className="admin-avatar" aria-hidden="true">
          {initialsOf(firstName, lastName)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold">
            {firstName} {lastName}
          </span>
          <span className="block truncate text-xs text-ink-muted">{roleLabel(role)}</span>
        </span>
      </Link>
      <p className="px-5 pb-2 pt-3 text-[11px] font-bold tracking-widest text-ink-muted uppercase">Back-office</p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <AdminNav />
      </div>
    </aside>
  );
}
