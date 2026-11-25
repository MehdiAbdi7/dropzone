// Les lignes des listes de filtres de la Boutique (capsule, 25/11), sans React : ce que le bouton
// « Type », « Marque » montre quand on l'ouvre. Séparé du composant pour être testé seul : les
// libellés, les nombres et l'ordre se vérifient sans afficher de page.
import type { AccessoryCatalog, BrandSeries } from "@/types/api";

// `value` est ce que la page met dans l'adresse ; `null` veut dire « Tous » ou « Toutes » (le
// filtre est vide). `detail` est le petit texte gris à droite de la ligne.
export type PickerOption = {
  value: string | null;
  label: string;
  detail: string;
  logoUrl: string | null;
};

// La valeur de l'option « Autres » : les produits d'une catégorie qui n'ont pas de marque. Elle est
// ici (et non dans DeviceBrowser) pour que la liste et la page parlent de la même valeur.
export const OTHERS = "autres";

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`;

// Une ligne par type, précédée de « Tous les types ». Le nombre est celui des produits du type.
export function accessoryTypeOptions(catalog: AccessoryCatalog): PickerOption[] {
  return [
    { value: null, label: "Tous les types", detail: String(catalog.products.length), logoUrl: null },
    ...catalog.types.map((type) => ({
      value: type.slug,
      label: type.name,
      detail: String(catalog.products.filter((product) => product.type === type.slug).length),
      logoUrl: null,
    })),
  ];
}

// Les marques du type choisi. Aucune ligne sur « Tous les types » ni pour un type sans marque
// (les verres incassables) : la page n'affiche alors pas le bouton « Marque ».
export function accessoryMakerOptions(catalog: AccessoryCatalog, type: string | null): PickerOption[] {
  const makers = catalog.types.find((one) => one.slug === type)?.makers ?? [];
  if (makers.length === 0) {
    return [];
  }
  const ofType = catalog.products.filter((product) => product.type === type);
  return [
    { value: null, label: "Toutes les marques", detail: String(ofType.length), logoUrl: null },
    ...makers.map((maker) => ({
      value: maker.slug,
      label: maker.name,
      detail: String(ofType.filter((product) => product.maker?.slug === maker.slug).length),
      logoUrl: maker.logoUrl,
    })),
  ];
}

// Les marques d'une catégorie d'appareils (smartphones, tablettes, PC portables…), chacune avec
// son nombre de séries. « Autres » arrive en dernier, seulement s'il y a des produits sans marque.
export function deviceBrandOptions(groups: BrandSeries[], othersCount: number): PickerOption[] {
  const brands = groups.map((group) => ({
    value: group.brand.slug,
    label: group.brand.name,
    detail: plural(group.series.length, "série"),
    logoUrl: group.brand.logoUrl,
  }));
  if (othersCount === 0) {
    return brands;
  }
  return [...brands, { value: OTHERS, label: "Autres", detail: plural(othersCount, "modèle"), logoUrl: null }];
}
