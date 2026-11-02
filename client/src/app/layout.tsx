import type { Metadata, Viewport } from "next";
import { Manrope, Montserrat } from "next/font/google";
import StoreProvider from "./StoreProvider";
import ThemeScript from "@/components/ui/ThemeScript";
import "./globals.css";

// Manrope pour le texte, Montserrat pour les titres et le logo.
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "DropZone (démo)", template: "%s · DropZone (démo)" },
  description: "Démo non officielle d'une boutique en ligne pour DropZone.",
  robots: { index: false, follow: false },
};

// L'en-tête est noir dans les deux thèmes : la barre du navigateur mobile aussi.
export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      data-theme="light"
      // ThemeScript peut changer data-theme avant React : on prévient React que
      // cet attribut peut différer du HTML du serveur.
      suppressHydrationWarning
      className={`${manrope.variable} ${montserrat.variable} h-full`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        <p className="bg-gradient-deep px-4 py-1.5 text-center text-xs font-semibold text-white sm:text-sm">
          {"Démo non officielle : ce site n'est pas celui de DropZone. Aucune commande n'est livrée."}
        </p>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
