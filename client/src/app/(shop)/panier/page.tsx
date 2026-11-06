import { redirect } from "next/navigation";

// Depuis le 06/11, le panier n'a plus de page : c'est une fenêtre, ouverte par le bouton de
// l'en-tête ou la barre du bas (comme Niwa Food). Une ancienne adresse mène à la Boutique.
export default function CartPage() {
  redirect("/boutique");
}
