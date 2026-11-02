import type { Metadata } from "next";
import CartView from "@/features/cart/CartView";

export const metadata: Metadata = { title: "Panier" };

export default function CartPage() {
  return (
    <div className="container-page space-y-6 py-8">
      <h1 className="text-3xl">Votre panier</h1>
      <CartView />
    </div>
  );
}
