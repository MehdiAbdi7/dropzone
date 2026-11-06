// La recherche des listes longues du formulaire produit (06/11), sans React : les cartes
// graphiques, processeurs ou couleurs ne s'affichent plus toutes, on tape pour les trouver.

// « Écran » et « ecran » se valent : sans accents, sans casse, espaces réduits.
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Les valeurs qui contiennent chaque mot tapé, celles qui commencent par la recherche en
// premier (« 60 » donne RTX 4060 avant… rien d'autre ; « bleu » donne Bleu avant Noir bleuté).
// Rien de tapé : les premières valeurs de la liste. `limit` garde la liste courte.
export function matchChoices(values: string[], query: string, limit: number): string[] {
  const wanted = normalize(query);
  if (!wanted) {
    return values.slice(0, limit);
  }
  const words = wanted.split(" ");
  const found = values.filter((value) => {
    const text = normalize(value);
    return words.every((word) => text.includes(word));
  });
  const starts = found.filter((value) => normalize(value).startsWith(wanted));
  const others = found.filter((value) => !normalize(value).startsWith(wanted));
  return [...starts, ...others].slice(0, limit);
}

// La valeur de la liste qui correspond exactement à ce qui est tapé (« rtx 4060 » →
// « RTX 4060 »), sinon null : on propose alors de l'ajouter.
export function exactChoice(values: string[], query: string): string | null {
  const wanted = normalize(query);
  return values.find((value) => normalize(value) === wanted) ?? null;
}
