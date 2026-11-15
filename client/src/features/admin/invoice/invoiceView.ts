import { ORDER_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/config/catalog";
import { formatPrice } from "@/lib/format";
import type { Invoice } from "@/features/admin/api/invoiceApi";

// Ce que la facture écrit, sans React : testé à part.

// « 16/11/2026 » : une date de facture, jour d'Alger.
export function invoiceDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Africa/Algiers" }).format(new Date(iso));
}

// Comment la facture dit que c'est payé : le moyen utilisé, ou ce qui reste à faire quand rien n'est encore
// payé (une livraison se paie à la réception).
export function paymentText(invoice: Pick<Invoice, "payment" | "order">): string {
  if (!invoice.payment) return invoice.order.type === "delivery" ? "À payer à la livraison" : "À payer";
  return invoice.payment.methods.map((method) => PAYMENT_METHOD_LABELS[method]).join(", ");
}

// Le type de la commande, tel qu'il s'imprime en haut de la facture.
export const invoiceTypeLabel = (invoice: Pick<Invoice, "order">): string => ORDER_TYPE_LABELS[invoice.order.type];

// La phrase d'un échange : ce que le client a payé en plus, ou ce que le magasin lui a rendu.
export function exchangeText(difference: number): string {
  if (difference > 0) return `Différence payée par le client : ${formatPrice(difference)}`;
  if (difference < 0) return `Différence rendue au client : ${formatPrice(-difference)}`;
  return "Aucune différence à payer";
}

// Les lignes d'identité du magasin, seulement celles qui sont remplies : un champ légal vide n'apparaît pas.
export function legalLines(shop: Invoice["shop"]): string[] {
  const entries: [string, string][] = [
    ["RC", shop.registerNumber],
    ["NIF", shop.nif],
    ["NIS", shop.nis],
    ["Art. d'imposition", shop.taxArticle],
  ];
  return entries.filter(([, value]) => value.trim() !== "").map(([label, value]) => `${label} : ${value}`);
}

// L'adresse de livraison du client sur une ligne ; null pour une vente ou un retrait.
export function customerAddress(customer: Invoice["customer"]): string | null {
  const parts = [customer.address, customer.commune, customer.wilaya].filter((part): part is string => !!part);
  return parts.length > 0 ? parts.join(", ") : null;
}
