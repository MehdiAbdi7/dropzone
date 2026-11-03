import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

// Le cadre des pages publiques : en-tête, contenu, pied de page.
export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main id="contenu" className="flex-1 hero-glow">
        {children}
      </main>
      <Footer />
    </>
  );
}
