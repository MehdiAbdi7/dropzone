import type { Condition, Options, PaymentMethod } from "@/types/api";

// Le ticket de la vente au magasin (16/11, lot 3). Fonctions pures : ce que la page affiche (lignes,
// total, réduction), ce qu'elle refuse tout de suite, et ce qui part vers l'API.

export const MAX_PER_LINE = 10;
export const MAX_UNIT_PRICE = 10_000_000;

// Une variante trouvée par la recherche du comptoir (GET /admin/variants).
export type VariantHit = {
  sku: string;
  productName: string;
  options: Options;
  condition: Condition;
  price: number;
  stock: number;
  conditionReport: string | null;
  image: string | null;
};

// Une ligne du ticket. `listPrice` : le prix catalogue ; `unitPrice` : le prix accordé (modifiable,
// NaN tant que le champ est vide, pour ne pas l'envoyer comme 0).
export type TicketLine = {
  key: string;
  sku: string;
  name: string;
  options: Options;
  condition: Condition;
  listPrice: number;
  unitPrice: number;
  quantity: number;
  maxQuantity: number;
};

export function addToTicket(lines: TicketLine[], hit: VariantHit): TicketLine[] {
  const maxQuantity = Math.min(hit.stock, MAX_PER_LINE);
  const existing = lines.find((line) => line.sku === hit.sku);
  if (existing) {
    return lines.map((line) =>
      line.sku === hit.sku ? { ...line, quantity: Math.min(line.quantity + 1, line.maxQuantity) } : line,
    );
  }
  return [
    ...lines,
    {
      key: hit.sku,
      sku: hit.sku,
      name: hit.productName,
      options: hit.options,
      condition: hit.condition,
      listPrice: hit.price,
      unitPrice: hit.price,
      quantity: 1,
      maxQuantity,
    },
  ];
}

export const ticketTotal = (lines: TicketLine[]): number =>
  lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

// (prix catalogue − prix accordé) × quantité ; une ligne dont le prix est encore vide n'y compte pas.
export const ticketReduction = (lines: TicketLine[]): number =>
  lines.reduce(
    (sum, line) => (Number.isNaN(line.unitPrice) ? sum : sum + (line.listPrice - line.unitPrice) * line.quantity),
    0,
  );

export type SaleForm = { fullName: string; phone: string };

// Un numéro algérien : 10 chiffres commençant par 0, comme le serveur (espaces, points, tirets permis).
const isPhone = (value: string) => /^0[2-7]\d{8}$/.test(value.replace(/[\s.-]/g, ""));

// Ce que l'API refuserait de toute façon, dit tout de suite en français.
export function ticketProblem(lines: TicketLine[], form: SaleForm): string | null {
  if (lines.length === 0) return "Le ticket est vide : ajoutez un appareil.";
  if (form.fullName.trim().length < 3) return "Le nom et le prénom du client (3 caractères au minimum).";
  if (!isPhone(form.phone.trim())) return "Le téléphone du client : 10 chiffres, par exemple 0555 12 34 56.";
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > line.maxQuantity) {
      return `Quantité de « ${line.name} » : de 1 à ${line.maxQuantity} (le stock).`;
    }
    if (!Number.isInteger(line.unitPrice) || line.unitPrice < 0 || line.unitPrice > MAX_UNIT_PRICE) {
      return `Prix de « ${line.name} » : un nombre entier de dinars, de 0 à 10 000 000.`;
    }
  }
  return null;
}

// Le corps de POST /admin/sales.
export function buildSaleBody(input: {
  lines: TicketLine[];
  form: SaleForm;
  method: PaymentMethod;
  note: string;
  acceptLimitations: boolean;
}) {
  const note = input.note.trim();
  return {
    fullName: input.form.fullName.trim(),
    phone: input.form.phone.trim(),
    method: input.method,
    ...(note ? { note } : {}),
    acceptLimitations: input.acceptLimitations,
    lines: input.lines.map((line) => ({ sku: line.sku, quantity: line.quantity, unitPrice: line.unitPrice })),
  };
}

// Les prix négociés à envoyer avec la validation d'un retrait ou la confirmation d'une livraison :
// seulement ceux qui ont changé (rien d'envoyé, rien de négocié).
export function pricesToSend(
  lines: { id: number; unitPrice: number; originalPrice: number }[],
): { id: number; unitPrice: number }[] {
  return lines
    .filter((line) => !Number.isNaN(line.unitPrice) && line.unitPrice !== line.originalPrice)
    .map((line) => ({ id: line.id, unitPrice: line.unitPrice }));
}
