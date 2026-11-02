import type { Metadata, Viewport } from "next";
import { Audiowide, Chakra_Petch, Manrope } from "next/font/google";
import StoreProvider from "./StoreProvider";
import ThemeScript from "@/components/ui/ThemeScript";
import "./globals.css";

// Manrope pour le texte, Chakra Petch (anguleuse, comme le logo) pour les titres,
// Audiowide pour le seul logo.
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
const audiowide = Audiowide({ variable: "--font-audiowide", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: { default: "DropZone (démo)", template: "%s · DropZone (démo)" },
  description: "Démo non officielle d'une boutique en ligne pour DropZone.",
  robots: { index: false, follow: false },
};

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
      className={`${manrope.variable} ${chakra.variable} ${audiowide.variable} h-full`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        <p className="badge-deal px-4 py-2 text-center text-sm font-semibold">
          {"Démo non officielle : ce site n'est pas celui de DropZone. Aucune commande n'est livrée."}
        </p>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
