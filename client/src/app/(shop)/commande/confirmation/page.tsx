import type { Metadata } from "next";
import ConfirmationView from "./ConfirmationView";

export const metadata: Metadata = { title: "Commande confirmée" };

export default async function ConfirmationPage({ searchParams }: PageProps<"/commande/confirmation">) {
  const { numero } = await searchParams;
  return (
    <div className="container-page py-10">
      <ConfirmationView number={typeof numero === "string" && /^\d+$/.test(numero) ? numero : undefined} />
    </div>
  );
}
