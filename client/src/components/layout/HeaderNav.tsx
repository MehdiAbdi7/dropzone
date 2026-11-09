"use client";

import { usePathname } from "next/navigation";
import { activeNavKey } from "./navigation";
import NavLinks from "./NavLinks";

// La navigation des grands écrans, avec le lien de la page en cours souligné.
export default function HeaderNav() {
  const active = activeNavKey(usePathname());
  return <NavLinks active={active} />;
}
