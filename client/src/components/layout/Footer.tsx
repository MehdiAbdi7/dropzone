import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { STORE_INFO } from "@/config/storeInfo";

// Le pied de page porte le téléphone et les liens légaux (loi 18-05, article 11).
export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="container-page grid gap-8 py-10 text-sm sm:grid-cols-3">
        <div className="space-y-3">
          <Logo size="text-xl" />
          <p className="max-w-xs text-ink-muted">{STORE_INFO.tagline}.</p>
        </div>
        <div className="space-y-2">
          <h2 className="text-base">Nous joindre</h2>
          <p className="text-ink-muted">Smartphones : {STORE_INFO.phones.smartphones}</p>
          <p className="text-ink-muted">PC portables : {STORE_INFO.phones.laptops}</p>
          <a href={STORE_INFO.instagram} className="text-blue-ink underline" rel="noopener noreferrer" target="_blank">
            Instagram @dropzone.officiel
          </a>
        </div>
        <div className="space-y-2">
          <h2 className="text-base">Commander</h2>
          <p className="text-ink-muted">Paiement à la livraison, dans les 58 wilayas.</p>
          <ul className="space-y-1">
            <li>
              <Link href="/suivi" className="underline">
                Suivre une commande
              </Link>
            </li>
            <li>
              <Link href="/conditions-generales-de-vente" className="underline">
                Conditions générales de vente
              </Link>
            </li>
            <li>
              <Link href="/mentions-legales" className="underline">
                Mentions légales
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
