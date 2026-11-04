"use client";

import { paletteFromChoices, type Palette } from "@/config/colors";
import { useChoicesQuery } from "./adminApi";

// La palette du back-office : les teintes de la liste « Couleurs », lues par RTK Query.
// Une teinte changée dans Listes invalide le cache « Choices » : pastilles et lueurs
// des pages du Catalogue suivent sans recharger.
export function usePalette(): Palette {
  const { data } = useChoicesQuery();
  return paletteFromChoices(data?.color);
}
