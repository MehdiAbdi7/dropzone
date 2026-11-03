import type { Metadata } from "next";
import { STATUS_LABELS, STATUS_STEPS } from "@/config/catalog";
import { FREE_SHIPPING_LABEL } from "@/config/shipping";
import { STORE_INFO } from "@/config/storeInfo";

export const metadata: Metadata = { title: "Conditions générales de vente" };

// Loi 18-05, articles 11 et 12 : ce que le client doit pouvoir lire avant de commander.
export default function TermsPage() {
  return (
    <div className="container-page max-w-3xl space-y-8 py-10 leading-relaxed">
      <h1 className="text-3xl">Conditions générales de vente</h1>
      <p className="rounded-lg border border-amber bg-amber-soft p-4 text-sm">
        Texte de démonstration, à valider par DropZone avant toute mise en service.
      </p>

      <section className="space-y-2">
        <h2 className="text-xl">Produits et prix</h2>
        <p>
          Les prix sont en dinars algériens, toutes taxes comprises. Une affaire est un appareil unique :
          sa fiche indique sa note d&apos;état, la santé de sa batterie, les pièces remplacées (d&apos;origine ou
          compatibles), ses défauts visibles, sa boîte d&apos;origine ou non, et ses limitations de fonctionnement. Les limitations doivent être acceptées avant la commande.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl">Commande et confirmation</h2>
        <p>
          La commande passe par trois étapes : le panier, le récapitulatif (prix, quantités et total, modifiables), puis
          la confirmation explicite. {STORE_INFO.confirmation}
        </p>
        <ul className="list-disc space-y-1 pl-5">
          {STATUS_STEPS.map((step) => (
            <li key={step.status}>
              <strong>{STATUS_LABELS[step.status]}</strong> : {step.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl">Livraison et paiement</h2>
        <p>
          Livraison dans les 58 wilayas, délai de {STORE_INFO.deliveryDelay}. {FREE_SHIPPING_LABEL} Le paiement se fait
          en espèces à la livraison.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl">Annulation, rétractation et retours</h2>
        <p>
          Une commande peut être annulée tant qu&apos;elle n&apos;est pas expédiée, en appelant le magasin. Retours,
          échanges et remboursements : {STORE_INFO.returns.toLowerCase()}.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl">Garantie et service après-vente</h2>
        <p>{STORE_INFO.warranty}.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl">Données personnelles</h2>
        <p>
          Le nom, le téléphone et l&apos;adresse servent uniquement à livrer et à suivre la commande (loi 18-07). Le mot
          de passe d&apos;un compte est enregistré sous forme chiffrée et n&apos;est jamais lisible.
        </p>
      </section>
    </div>
  );
}
