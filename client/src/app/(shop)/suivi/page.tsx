import type { Metadata } from "next";
import TrackForm from "@/features/orders/TrackForm";

export const metadata: Metadata = { title: "Suivre une commande" };

export default async function TrackPage({ searchParams }: PageProps<"/suivi">) {
  const { numero } = await searchParams;
  return (
    <div className="container-page space-y-6 py-8">
      <h1 className="text-3xl">Suivre une commande</h1>
      <p className="max-w-xl text-ink-muted">
        Entrez le numéro reçu à la commande et le téléphone donné pour la livraison.
      </p>
      <TrackForm initialNumber={typeof numero === "string" ? numero : undefined} />
    </div>
  );
}
