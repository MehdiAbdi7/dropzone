import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { InstagramIcon } from "@/components/ui/icons";
import { STORE_INFO } from "@/config/storeInfo";

// Le pied de page, sombre dans les deux thèmes. Il porte le téléphone et les liens
// légaux (loi 18-05, article 11).
export default function Footer() {
  return (
    <footer className="brand-dark mt-16 border-t border-line">
      <div className="container-page grid gap-8 py-12 text-sm sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo size="text-2xl" />
          <p className="max-w-xs text-ink-muted">{STORE_INFO.tagline}.</p>
          <a
            href={STORE_INFO.instagram}
            className="inline-flex items-center gap-2 font-semibold text-blue-ink hover:underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            <InstagramIcon size={18} />
            {STORE_INFO.instagramHandle}
          </a>
        </div>
        <div className="space-y-3">
          <h2 className="text-base">Nous joindre</h2>
          <p className="text-ink-muted">Smartphones : {STORE_INFO.phones.smartphones}</p>
          <p className="text-ink-muted">PC portables : {STORE_INFO.phones.laptops}</p>
          <p className="text-ink-muted">Magasin à {STORE_INFO.town}, {STORE_INFO.city}</p>
        </div>
        <div className="space-y-3">
          <h2 className="text-base">Commander</h2>
          <p className="text-ink-muted">Paiement à la livraison, dans les 58 wilayas.</p>
          <ul className="space-y-2">
            <li>
              <Link href="/suivi" className="hover:text-blue-ink hover:underline">
                Suivre une commande
              </Link>
            </li>
            <li>
              <Link href="/conditions-generales-de-vente" className="hover:text-blue-ink hover:underline">
                Conditions générales de vente
              </Link>
            </li>
            <li>
              <Link href="/mentions-legales" className="hover:text-blue-ink hover:underline">
                Mentions légales
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
