import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { hasQuote, repairAmount, type Status } from "./repairRules.js";

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
      parts: { select: { quantity: true, unitPrice: true } },
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
  else if (repair.status === "returned") price = repair.paidAmount ?? 0;
  else if (refused) price = repair.laborPrice ?? 0;
  else price = hasQuote(repair.laborPrice, repair.parts.length) ? repairAmount({ underWarranty: false, refused: false, laborPrice: repair.laborPrice, lines: repair.parts }) : null;

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
    warrantyEndsAt: day(repair.warrantyEndsAt),
    price,
    returnedOn: day(repair.returnedOn),
    steps,
  };
}
