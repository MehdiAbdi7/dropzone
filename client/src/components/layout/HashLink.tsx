"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";

// Un lien vers une section (« /#categories »). Next.js ne fait rien quand on clique
// sur un lien vers l'adresse déjà affichée : au deuxième clic, l'adresse vaut déjà
// /#categories et la page ne bougeait plus. Sur la bonne page, on fait donc défiler
// nous-mêmes, comme le ferait un lien HTML classique ; ailleurs, Next.js navigue.
export default function HashLink({ href, onClick, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const pathname = usePathname();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    const [path, id] = href.split("#");
    const target = id ? document.getElementById(id) : null;
    if (!target || (path || "/") !== pathname) {
      return;
    }
    event.preventDefault();
    if (window.location.hash !== `#${id}`) {
      window.history.pushState(null, "", `#${id}`);
    }
    // Après les autres gestionnaires du clic : en se fermant, le menu mobile rend le
    // focus à son bouton, en haut de la page, ce qui annulerait un défilement immédiat.
    setTimeout(() => target.scrollIntoView(), 0);
  }

  return <Link href={href} onClick={handleClick} {...props} />;
}
