import type { Metadata } from "next";
import TrackChoice from "@/features/orders/TrackChoice";

export const metadata: Metadata = { title: "Suivre une commande ou une réparation" };

export default async function TrackPage({ searchParams }: PageProps<"/suivi">) {
  const { numero, type } = await searchParams;
  return (
    <div className="container-page space-y-6 py-8">
      <h1 className="text-3xl">Suivre une commande ou une réparation</h1>
      <p className="max-w-xl text-ink-muted">
        Choisissez ce que vous suivez, puis entrez le numéro reçu et le téléphone donné au magasin.
      </p>
      <TrackChoice initialKind={type === "reparation" ? "repair" : "order"} initialNumber={typeof numero === "string" ? numero : undefined} />
    </div>
  );
}
