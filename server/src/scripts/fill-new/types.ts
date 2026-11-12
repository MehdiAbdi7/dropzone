// Ce que le script « fill:new » sait d'un appareil : le prix du neuf au marché algérien
// (relevé Ouedkniss du 12/11/2026, voir context/import/analyse-prix-neuf-dropzone.md), la
// configuration vendue, et la fiche (caractéristiques et description).
export type DeviceRow = {
  // Le nom exact du modèle en base (device_models.name), unique dans sa sorte d'appareil.
  name: string;
  price: number;
  // 3 quand le neuf existe sur le marché ; 0 quand il n'existe plus : la fiche est complète,
  // la boutique affiche « Épuisé » et personne ne peut le commander (décision de Mehdi, 12/11).
  stock: 0 | 3;
  // Les options de la variante neuve (Stockage, RAM, SIM, Processeur…). La couleur vient du modèle.
  options: Record<string, string>;
  // Une phrase sur l'appareil, mise en tête de la description.
  blurb: string;
  // Les caractéristiques à ajouter. Pour un produit qui existe déjà, seules les clés absentes sont ajoutées.
  specs: Record<string, string>;
  // Une couleur à imposer (les PC n'ont pas de couleurs officielles en base).
  color?: string;
};

export type Maker = "Apple" | "Samsung" | "Honor" | "Huawei" | "Vivo";
