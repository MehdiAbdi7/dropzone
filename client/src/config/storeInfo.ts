// Les informations légales du magasin (loi 18-05, article 11). En démo, les vraies
// valeurs ne sont pas connues : le jour de l'accord avec DropZone, seul ce fichier change.
const TO_PROVIDE = "Fournie par DropZone après accord";

export const STORE_INFO = {
  name: "DropZone",
  // Ce que DropZone vend vraiment (relevé Instagram du 04/11) : pas d'audiovisuel.
  tagline: "Laptops, smartphones et tablettes, sélectionnés d'Europe",
  town: "Kouba",
  city: "Alger",
  instagram: "https://www.instagram.com/dropzone.officiel/",
  instagramHandle: "@dropzone.officiel",
  // Relevé sur Instagram le 02/11/2026 : à remettre à jour de temps en temps.
  instagramFollowers: "128 k",
  phones: {
    smartphones: "07 95 13 19 17",
    laptops: "05 50 61 12 57",
  },
  email: TO_PROVIDE,
  address: `Kouba, Alger (${TO_PROVIDE.toLowerCase()} : adresse exacte)`,
  nif: TO_PROVIDE,
  commerceRegister: TO_PROVIDE,
  // Ce que disent les annonces : 3 mois sur un PC, 6 mois sur un téléphone d'occasion,
  // 12 mois sur le neuf. La durée exacte est sur chaque fiche et sur la commande.
  warranty: "De 3 à 12 mois selon l'appareil, indiquée sur sa fiche et sur la commande",
  returns: TO_PROVIDE,
  deliveryDelay: "2 à 5 jours ouvrés selon la wilaya (à confirmer par DropZone)",
  confirmation: "Le magasin vous appelle pour confirmer la commande avant l'expédition (à confirmer par DropZone).",
};
