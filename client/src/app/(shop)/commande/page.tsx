import type { Metadata } from "next";
import CheckoutForm from "@/features/orders/CheckoutForm";
import { getCurrentUser } from "@/lib/serverFetch";

export const metadata: Metadata = { title: "Commande" };

// Le compte est lu côté serveur : un client connecté retrouve son nom, son
// téléphone et son adresse, sans requête 401 inutile pour un invité.
export default async function CheckoutPage() {
  const user = await getCurrentUser();
  return (
    <div className="container-page space-y-6 py-8">
      <h1 className="text-3xl">Commander</h1>
      <CheckoutForm user={user} />
    </div>
  );
}
