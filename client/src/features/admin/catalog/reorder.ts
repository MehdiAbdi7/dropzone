// Déplace un élément d'une position à une autre, sans toucher à la liste d'origine
// (l'ordre des modèles dans l'affiche : glisser-déposer, ou « Monter » / « Descendre »).
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
