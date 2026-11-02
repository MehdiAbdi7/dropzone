import Link from "next/link";

// Le logo de DropZone : le mot en Montserrat 800, dégradé du bleu au rouge.
// Le même partout, back-office compris.
export default function Logo({ href = "/", size = "text-2xl" }: { href?: string; size?: string }) {
  return (
    <Link
      href={href}
      className={`font-logo ${size} text-gradient leading-none font-extrabold tracking-tight whitespace-nowrap`}
      aria-label="DropZone, accueil"
    >
      DropZone
    </Link>
  );
}
