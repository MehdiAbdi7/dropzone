import type { Metadata, Viewport } from "next";
import { Manrope, Montserrat } from "next/font/google";
import StoreProvider from "./StoreProvider";
import ThemeScript from "@/components/ui/ThemeScript";
import ShopPageTransition from "@/features/shop/ShopPageTransition";
import { SITE_INDEXABLE, SITE_URL } from "@/config/site";
import { STORE_INFO } from "@/config/storeInfo";
import "./globals.css";

// Manrope pour le texte, Montserrat pour les titres et le logo.
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const DESCRIPTION = "Démo non officielle d'une boutique en ligne pour DropZone.";

// metadataBase : les images et adresses relatives (Open Graph, canonical) deviennent absolues.
// L'aperçu d'un lien partagé (WhatsApp, Instagram, Facebook) vient d'openGraph, l'image
// d'app/opengraph-image.tsx ; une fiche produit la remplace par sa propre photo.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "DropZone (démo)", template: "%s · DropZone (démo)" },
  description: DESCRIPTION,
  robots: SITE_INDEXABLE ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: {
    type: "website",
    locale: "fr_DZ",
    siteName: "DropZone (démo)",
    title: "DropZone (démo)",
    description: `${STORE_INFO.tagline}. ${DESCRIPTION}`,
  },
  twitter: { card: "summary_large_image" },
};

// L'en-tête est noir dans les deux thèmes : la barre du navigateur mobile aussi.
export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      data-theme="dark"
      // ThemeScript peut changer data-theme avant React : on prévient React que
      // cet attribut peut différer du HTML du serveur.
      suppressHydrationWarning
      // scroll-pt-20 : un lien vers une section (#categories) s'arrête sous l'en-tête collant.
      className={`${manrope.variable} ${montserrat.variable} h-full scroll-pt-20`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        <p className="bg-gradient-deep px-4 py-1.5 text-center text-xs font-semibold text-white sm:text-sm">
          {"Démo non officielle : ce site n'est pas celui de DropZone. Aucune commande n'est livrée."}
        </p>
        <StoreProvider>
          <ShopPageTransition>{children}</ShopPageTransition>
        </StoreProvider>
      </body>
    </html>
  );
}
