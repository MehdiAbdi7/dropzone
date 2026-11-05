import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import CartBar from "@/features/cart/CartBar";

// Le cadre des pages publiques : en-tête, contenu, pied de page, et la barre du panier
// (05/11) toujours visible en bas, sauf sur le panier et la commande. Elle vient après le
// pied de page : sa place réservée laisse le bas de la page lisible.
export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main id="contenu" className="flex-1 hero-glow">
        {children}
      </main>
      <Footer />
      <CartBar />
    </>
  );
}
