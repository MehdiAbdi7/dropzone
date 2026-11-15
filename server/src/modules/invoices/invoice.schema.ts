import { z } from "zod";

// Un champ de texte des réglages : les espaces autour sont retirés, vide = absent de la facture.
const text = (max: number) => z.string().trim().max(max);

// Réglages › Facture (lot 6) : ce qui s'imprime en tête et en bas. Seul le nom du magasin est obligatoire ;
// les champs légaux vides n'apparaissent pas sur la facture (le statut juridique de DropZone n'est pas connu).
export const invoiceSettingsSchema = z.object({
  shopName: z.string().trim().min(1, { error: "Le nom du magasin" }).max(80),
  legalForm: text(60),
  address: text(200),
  phones: text(120),
  email: text(120),
  instagram: text(80),
  registerNumber: text(60),
  nif: text(40),
  nis: text(40),
  taxArticle: text(40),
  rib: text(60),
  warrantyTerms: text(1500),
  footerNote: text(300),
  // La TVA, éteinte par défaut : tant que le statut n'est pas connu, aucun taux n'est inventé.
  vatEnabled: z.boolean(),
  vatRate: z.number().int({ error: "Un taux entier, par exemple 19" }).min(0).max(100),
});
export type InvoiceSettingsInput = z.infer<typeof invoiceSettingsSchema>;
