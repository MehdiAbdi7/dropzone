"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { activeNavKey } from "./navigation";
import NavLinks from "./NavLinks";

// La navigation des grands écrans, avec le lien de la page en cours souligné.
// useSearchParams demande une frontière Suspense dans Header.
export default function HeaderNav() {
  const active = activeNavKey(usePathname(), useSearchParams());
  return <NavLinks active={active} />;
}
