// Un texte sans accents ni majuscules : « Éloïse » et « eloise » se trouvent l'un l'autre. Pour les recherches
// faites en JavaScript sur des listes courtes (pièces, fiches de réparation).
export const normalizeText = (text: string) => text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
