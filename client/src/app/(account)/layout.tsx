import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

// Les pages de compte gardent l'en-tête de la boutique.
export default function AccountLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
