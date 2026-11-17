import { formatPrice } from "@/lib/format";
import type { TradeInRow } from "@/features/admin/api/exchangeApi";
import { emptyVariant } from "@/features/admin/products/productDraft";
import { MAX_UNIT_PRICE } from "@/features/admin/sales/ticket";
import { buildTradeInBody, type TradeInDraft } from "./exchange";

// La liste « Reprises à mettre en vente » (lot 5) : ce qui s'affiche et ce que la page refuse, sans React.

// Le prix de revente tapé, en nombre ; NaN tant qu'il est vide ou n'est pas un entier de dinars.
export function resalePrice(text: string): number {
  const trimmed = text.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

export function resaleProblem(text: string): string | null {
  const price = resalePrice(text);
  return Number.isNaN(price) || price > MAX_UNIT_PRICE
    ? "Le prix de revente : un nombre entier de dinars, de 0 à 10 000 000."
    : null;
}

// Ce que la revente rapportera au magasin : le prix de revente moins le prix de reprise, qui est le prix
// d'achat de l'affaire. Une marge négative est dite en toutes lettres (on vendrait à perte).
export function marginText(resale: number, tradeInPrice: number): string | null {
  if (Number.isNaN(resale)) return null;
  const margin = resale - tradeInPrice;
  if (margin > 0) return `Marge : ${formatPrice(margin)}`;
  if (margin < 0) return `À perte : ${formatPrice(-margin)} de moins que la reprise`;
  return "Aucune marge : au prix de la reprise";
}

// La fiche d'état en une ligne, pour reconnaître le téléphone : « 8/10 · batterie 88 % · 1 défaut ».
export function sheetSummary(sheet: TradeInRow["sheet"]): string {
  const parts: string[] = [];
  if (sheet.grade) parts.push(`${sheet.grade}/10`);
  if (sheet.batteryHealth !== null && sheet.batteryHealth !== undefined) parts.push(`batterie ${sheet.batteryHealth} %`);
  if (sheet.defects?.length) parts.push(`${sheet.defects.length} défaut${sheet.defects.length > 1 ? "s" : ""}`);
  if (sheet.replacedParts?.length) parts.push(`${sheet.replacedParts.length} pièce${sheet.replacedParts.length > 1 ? "s" : ""} changée${sheet.replacedParts.length > 1 ? "s" : ""}`);
  if (sheet.withBox === true) parts.push("avec sa boîte");
  if (sheet.withBox === false) parts.push("sans boîte");
  return parts.join(" · ");
}

// La reprise enregistrée, remise dans le formulaire de la fiche d'état (modifier avant la mise en vente, 18/11).
// Une pièce changée est dite « compatible » si la fiche l'a rangée dans les pièces compatibles, sinon d'origine.
export function tradeInToDraft(row: TradeInRow): TradeInDraft {
  const { sheet } = row;
  const kind = row.deviceModel.kind;
  const base = emptyVariant("refurbished", kind);
  const replacedParts = sheet.replacedParts ?? [];
  const compatibleParts = sheet.compatibleParts ?? [];
  return {
    kind,
    // Les couleurs du modèle ne sont pas dans la liste des reprises : toutes les couleurs restent proposées.
    model: { id: row.deviceModel.id, brand: row.deviceModel.brand, name: row.deviceModel.name, colors: [] },
    variant: {
      ...base,
      options: { ...(sheet.options ?? {}), Couleur: row.color },
      grade: sheet.grade == null ? "" : String(sheet.grade),
      batteryHealth: sheet.batteryHealth == null ? "" : String(sheet.batteryHealth),
      replacedParts,
      partOrigins: Object.fromEntries(replacedParts.map((part) => [part, compatibleParts.includes(part) ? "compatible" : "origine"])),
      defects: sheet.defects ?? [],
      limitations: sheet.limitations ?? [],
      withBox: sheet.withBox ?? null,
      details: sheet.details ?? "",
      warrantyMonths: sheet.warrantyMonths == null ? "" : String(sheet.warrantyMonths),
      origin: sheet.origin ?? "",
    },
    price: String(row.price),
    repairCost: row.repairCost > 0 ? String(row.repairCost) : "",
  };
}

// Les frais de remise en état tapés, en nombre ; 0 quand le champ est vide ; NaN si ce n'est pas un entier.
export function repairCostOf(text: string): number {
  const trimmed = text.trim();
  if (trimmed === "") return 0;
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

// Le corps de PATCH /admin/trade-ins/:id : la fiche et les frais, jamais le modèle ni le prix de reprise.
export function buildTradeInUpdateBody(draft: TradeInDraft) {
  // Le modèle et le prix de reprise sont retirés du corps : ils ne changent pas.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { deviceModelId, price, ...sheet } = buildTradeInBody(draft);
  return { ...sheet, repairCost: repairCostOf(draft.repairCost) };
}
