import { CONDITION_LABELS } from "@/config/catalog";
import { warrantyLabel } from "@/config/warranty";
import type { Invoice } from "@/features/admin/api/invoiceApi";
import { formatOptions, formatPrice } from "@/lib/format";
import { customerAddress, exchangeText, invoiceDate, invoiceTypeLabel, legalLines, paymentText } from "./invoiceView";

// La facture A4 (lot 6). Papier blanc, texte noir, quel que soit le thème : c'est un document qu'on donne au
// client. Tout vient du serveur (réglages du magasin, commande, numéro) ; la zone `.print-area` est la seule
// qui s'imprime (voir styles/print.css). Un champ du magasin laissé vide n'apparaît pas.
export default function InvoiceSheet({ invoice }: { invoice: Invoice }) {
  const { shop, customer } = invoice;
  const address = customerAddress(customer);
  const hasDiscount = invoice.lines.some((line) => !line.isGift && line.listPrice !== line.unitPrice);

  return (
    <article aria-label={`Facture ${invoice.number}`} className="print-area mx-auto w-full max-w-[210mm] space-y-6 bg-white p-6 text-sm text-black sm:p-10">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-neutral-300 pb-5">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-extrabold">{shop.name}</h1>
          {shop.legalForm ? <p>{shop.legalForm}</p> : null}
          {shop.address ? <p>{shop.address}</p> : null}
          {shop.phones ? <p>Tél. {shop.phones}</p> : null}
          {shop.email ? <p>{shop.email}</p> : null}
          {shop.instagram ? <p>{shop.instagram}</p> : null}
          {legalLines(shop).map((line) => (
            <p key={line} className="text-neutral-700">
              {line}
            </p>
          ))}
        </div>
        <div className="space-y-0.5 text-right">
          <p className="text-2xl font-extrabold tracking-wide">FACTURE</p>
          <p className="text-lg font-bold">{invoice.number}</p>
          <p>Date : {invoiceDate(invoice.issuedAt)}</p>
          <p className="text-neutral-700">
            Commande n° {invoice.order.dailyNumber} du {invoiceDate(`${invoice.order.businessDate}T12:00:00Z`)} · suivi {invoice.order.number}
          </p>
          <p className="font-semibold">{invoiceTypeLabel(invoice)}</p>
        </div>
      </header>

      <section aria-label="Client" className="space-y-0.5">
        <p className="text-xs font-bold tracking-widest text-neutral-600">CLIENT</p>
        <p className="font-semibold">{customer.fullName}</p>
        <p>{customer.phone}</p>
        {address ? <p>{address}</p> : null}
      </section>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-y border-neutral-400 bg-neutral-100 text-xs uppercase">
            <th className="px-2 py-2">Désignation</th>
            <th className="px-2 py-2 text-right">Qté</th>
            {hasDiscount ? <th className="px-2 py-2 text-right">Prix catalogue</th> : null}
            <th className="px-2 py-2 text-right">Prix unitaire</th>
            <th className="px-2 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line, index) => (
            <tr key={`${line.name}-${index}`} className="border-b border-neutral-200 align-top">
              <td className="px-2 py-2">
                <p className="font-semibold">{line.name}</p>
                <p className="text-xs text-neutral-700">
                  {CONDITION_LABELS[line.condition]}
                  {Object.keys(line.options).length ? ` · ${formatOptions(line.options)}` : ""}
                  {warrantyLabel(line.warrantyMonths) ? ` · ${warrantyLabel(line.warrantyMonths)}` : ""}
                </p>
                {line.conditionReport ? <p className="text-xs text-neutral-700">{line.conditionReport}</p> : null}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">{line.quantity}</td>
              {hasDiscount ? <td className="px-2 py-2 text-right tabular-nums">{line.isGift ? "" : formatPrice(line.listPrice)}</td> : null}
              <td className="px-2 py-2 text-right tabular-nums">{line.isGift ? "Offert" : formatPrice(line.unitPrice)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{line.isGift ? "0 DA" : formatPrice(line.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {invoice.tradeIn ? (
        <section aria-label="Téléphone repris" className="space-y-0.5 rounded border border-neutral-300 p-3">
          <p className="text-xs font-bold tracking-widest text-neutral-600">TÉLÉPHONE REPRIS</p>
          <p className="font-semibold">
            {invoice.tradeIn.modelName} · {invoice.tradeIn.color}
          </p>
          <p>Repris à {formatPrice(invoice.tradeIn.price)}</p>
        </section>
      ) : null}

      <section aria-label="Totaux" className="ml-auto w-full max-w-xs space-y-1">
        <p className="flex justify-between gap-6">
          <span>Sous-total</span>
          <span className="tabular-nums">{formatPrice(invoice.subtotal)}</span>
        </p>
        {invoice.order.type === "delivery" ? (
          <p className="flex justify-between gap-6">
            <span>Livraison</span>
            <span className="tabular-nums">{invoice.shippingFee === 0 ? "Offerte" : formatPrice(invoice.shippingFee)}</span>
          </p>
        ) : null}
        {invoice.discount > 0 ? (
          <p className="flex justify-between gap-6 text-neutral-700">
            <span>Réduction accordée (déjà déduite)</span>
            <span className="tabular-nums">−{formatPrice(invoice.discount)}</span>
          </p>
        ) : null}
        {invoice.vat ? (
          <>
            <p className="flex justify-between gap-6">
              <span>Total hors taxe</span>
              <span className="tabular-nums">{formatPrice(invoice.vat.excludingTax)}</span>
            </p>
            <p className="flex justify-between gap-6">
              <span>TVA {invoice.vat.rate} %</span>
              <span className="tabular-nums">{formatPrice(invoice.vat.amount)}</span>
            </p>
          </>
        ) : null}
        <p className="flex justify-between gap-6 border-t border-neutral-400 pt-2 text-lg font-extrabold">
          <span>Total{invoice.vat ? " TTC" : ""}</span>
          <span className="tabular-nums">{formatPrice(invoice.total)}</span>
        </p>
        {invoice.difference !== null ? <p className="pt-1 font-semibold">{exchangeText(invoice.difference)}</p> : null}
      </section>

      <p>
        Arrêtée la présente facture à la somme de : <strong>{invoice.totalInWords}</strong>.
      </p>
      <p>
        Mode de paiement : <strong>{paymentText(invoice)}</strong>
      </p>
      {invoice.limitationsAccepted ? <p>Le client a pris connaissance des limitations des appareils reconditionnés et les accepte.</p> : null}
      {invoice.note ? <p>Remarque : {invoice.note}</p> : null}

      {invoice.warrantyTerms ? (
        <section aria-label="Conditions de garantie et de retour" className="space-y-1 border-t border-neutral-300 pt-4 text-xs text-neutral-800">
          <p className="font-bold">Conditions de garantie et de retour</p>
          <p className="whitespace-pre-line">{invoice.warrantyTerms}</p>
        </section>
      ) : null}
      {shop.rib ? <p className="text-xs">RIB : {shop.rib}</p> : null}
      {invoice.footerNote ? <p className="border-t border-neutral-300 pt-3 text-center text-xs text-neutral-700">{invoice.footerNote}</p> : null}
    </article>
  );
}
