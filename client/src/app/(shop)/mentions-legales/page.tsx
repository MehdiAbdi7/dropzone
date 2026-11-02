import type { Metadata } from "next";
import { STORE_INFO } from "@/config/storeInfo";

export const metadata: Metadata = { title: "Mentions légales" };

// Loi 18-05, article 11 : l'identité du commerce. Les valeurs viennent de storeInfo.ts.
export default function LegalPage() {
  const rows = [
    ["Commerce", STORE_INFO.name],
    ["Adresse", STORE_INFO.address],
    ["Téléphone (smartphones)", STORE_INFO.phones.smartphones],
    ["Téléphone (PC portables)", STORE_INFO.phones.laptops],
    ["Email", STORE_INFO.email],
    ["NIF", STORE_INFO.nif],
    ["Registre du commerce", STORE_INFO.commerceRegister],
  ];
  return (
    <div className="container-page max-w-3xl space-y-6 py-10">
      <h1 className="text-3xl">Mentions légales</h1>
      <p className="rounded-lg border border-amber bg-amber-soft p-4 text-sm">
        Site de démonstration non officiel. Les informations marquées « fournie par DropZone après accord » seront
        complétées par le magasin.
      </p>
      <dl className="card divide-y divide-line">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 p-4 sm:grid-cols-[14rem_1fr]">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
