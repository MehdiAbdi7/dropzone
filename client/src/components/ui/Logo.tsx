import Link from "next/link";

// Le logo de DropZone : le mot en lettres anguleuses, dégradé du bleu au rouge.
export default function Logo({ href = "/", size = "text-2xl" }: { href?: string; size?: string }) {
  return (
    <Link href={href} className={`font-logo ${size} text-gradient leading-none whitespace-nowrap`} aria-label="DropZone, accueil">
      DropZone
    </Link>
  );
}
