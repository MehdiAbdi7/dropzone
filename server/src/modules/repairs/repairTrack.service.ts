import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import type { RepairDecision } from "./repair.schema.js";
import { hasQuote, quoteTotal, repairAmount, type Status } from "./repairRules.js";
import { changeStatus } from "./repairStatus.service.js";

const NOT_FOUND = "Aucune réparation ne correspond à ce numéro et ce téléphone";

// La réponse du client à son devis (21/11) : accepter fait passer la fiche En réparation (les pièces sortent du stock),
// refuser la laisse « À rendre sans réparation » (les pièces déjà sorties reviennent). Seule l'étape « Devis à valider »
// attend une réponse, et une réponse donnée ne se change pas. Le client n'a pas de compte : le numéro et le téléphone
// le désignent, comme pour le suivi, et l'événement s'écrit sans auteur. Rend le suivi à jour.
export async function decideQuote(number: number, phone: string, decision: RepairDecision): Promise<RepairTracking> {
  const repair = await prisma.repair.findFirst({ where: { number, phone }, select: { id: true, status: true } });
  // Un numéro inconnu et un mauvais téléphone répondent pareil : on ne confirme pas qu'une fiche existe.
  if (!repair) {
    throw new AppError(404, NOT_FOUND);
  }
  if (repair.status !== "quote") {
    throw new AppError(409, "Ce devis n'attend plus de réponse");
  }
  try {
    await changeStatus(repair.id, decision === "accept" ? "in_repair" : "to_return", null);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 409) {
      // Le message d'une pièce manquante nomme la pièce et le stock du magasin : pas pour le client. Un passage devenu
      // impossible entre-temps (le magasin a changé la fiche) : le devis n'attend plus de réponse.
      const stock = /^(Stock insuffisant|Pièce épuisée)/.test(error.message);
      throw new AppError(409, stock ? "Une pièce du devis n'est plus disponible : le magasin vous appelle." : "Ce devis n'attend plus de réponse");
    }
    throw error;
  }
  return trackRepair(number, phone);
}

// Le suivi public d'une réparation (18/11, étape 4). Le client voit où en est son appareil, pas la cuisine du
// magasin : la réponse est construite CHAMP PAR CHAMP (liste blanche), jamais en retirant des champs d'une fiche
// complète. Rien de ce qui touche aux coûts, aux notes du technicien, aux noms de pièces, aux comptes, ni même au
// nom et au téléphone du client (il les connaît, et ils n'ont rien à faire dans une réponse sans connexion).
export type RepairTracking = {
  number: number;
  deviceName: string;
  deviceColor: string | null;
  status: Status;
  refused: boolean;
  underWarranty: boolean;
  warrantyEndsAt: string | null;
  // Ce que le client paie : null tant que le devis n'est pas fixé, et sous garantie (il ne paie rien).
  price: number | null;
  // Le devis en détail (21/11), pour que le client accepte ou refuse en connaissance de cause : la main-d'œuvre à part,
  // puis chaque pièce avec son PRIX DE VENTE. Jamais un coût. null à « Reçu » (un brouillon), sous garantie et si le
  // devis est refusé. Il reste lisible une fois accepté : c'est le contenu du bon de réparation.
  quote: { labor: number; items: { name: string; quantity: number; unitPrice: number }[]; total: number } | null;
  returnedOn: string | null;
  // La première date de chaque étape traversée : une étape revenue (« Devis » après « En réparation ») garde la sienne.
  steps: { status: Status; at: Date }[];
};

const day = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

export async function trackRepair(number: number, phone: string): Promise<RepairTracking> {
  const repair = await prisma.repair.findFirst({
    where: { number, phone },
    select: {
      number: true,
      deviceName: true,
      deviceColor: true,
      status: true,
      underWarranty: true,
      warrantyEndsAt: true,
      laborPrice: true,
      paidAmount: true,
      returnedOn: true,
      parts: { orderBy: { id: "asc" }, select: { name: true, quantity: true, unitPrice: true } },
      events: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { status: true, createdAt: true } },
    },
  });
  // Un numéro inconnu et un mauvais téléphone répondent pareil : on ne confirme pas qu'une fiche existe.
  if (!repair) {
    throw new AppError(404, "Aucune réparation ne correspond à ce numéro et ce téléphone");
  }

  const refused = repair.events.some((event) => event.status === "to_return");
  let price: number | null;
  if (repair.underWarranty) price = null;
  // Le prix est fixé à « Devis à valider » (cahier §6) : avant, une main-d'œuvre ou une pièce saisie n'est qu'un brouillon.
  else if (repair.status === "received") price = null;
  else if (repair.status === "returned") price = repair.paidAmount ?? 0;
  else if (refused) price = repair.laborPrice ?? 0;
  else price = hasQuote(repair.laborPrice, repair.parts.length) ? repairAmount({ underWarranty: false, refused: false, laborPrice: repair.laborPrice, lines: repair.parts }) : null;

  // Le détail n'existe que là où le prix existe (même règle que `price`), jamais pour un devis refusé.
  const showQuote = !repair.underWarranty && !refused && repair.status !== "received" && hasQuote(repair.laborPrice, repair.parts.length);
  const quote: RepairTracking["quote"] = showQuote
    ? {
        labor: repair.laborPrice ?? 0,
        items: repair.parts.map((line) => ({ name: line.name, quantity: line.quantity, unitPrice: line.unitPrice })),
        total: quoteTotal(repair.laborPrice, repair.parts),
      }
    : null;

  const steps: RepairTracking["steps"] = [];
  for (const event of repair.events) {
    if (!steps.some((step) => step.status === event.status)) steps.push({ status: event.status, at: event.createdAt });
  }

  return {
    number: repair.number,
    deviceName: repair.deviceName,
    deviceColor: repair.deviceColor,
    status: repair.status,
    refused,
    underWarranty: repair.underWarranty,
    // Une garantie forcée hors (appareil tombé dans l'eau) garde la date de la vente en base : le client ne doit
    // jamais lire une fin de garantie dans le futur pour un appareil hors garantie.
    warrantyEndsAt: repair.underWarranty ? day(repair.warrantyEndsAt) : null,
    price,
    quote,
    returnedOn: day(repair.returnedOn),
    steps,
  };
}
