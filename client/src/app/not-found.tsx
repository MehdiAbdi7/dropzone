import Link from "next/link";
import Logo from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <main id="contenu" className="container-page flex flex-1 flex-col items-start justify-center gap-5 py-20">
      <Logo />
      <h1 className="text-4xl">Cette page n&apos;existe pas.</h1>
      <p className="max-w-md text-ink-muted">
        Le produit a peut-être été vendu ou retiré. Cherchez le modèle dans le catalogue.
      </p>
      <Link href="/produits" className="btn btn-primary">
        Voir le catalogue
      </Link>
    </main>
  );
}
