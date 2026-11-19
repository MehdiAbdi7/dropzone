// Les numéros de la pagination des listes de commandes (20/11) : « 1 2 3 4 … 24 ». On garde toujours la première
// et la dernière page et les voisines de la page affichée ; un trou de deux pages ou plus devient « … », un trou
// d'une seule page montre cette page (« … » pour une page de plus ne gagnerait rien). Jusqu'à 7 pages : toutes.
export type PageItem = number | "…";

export function pageList(current: number, total: number): PageItem[] {
  if (total <= 0) return [];
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const wanted = new Set([1, total, current - 1, current, current + 1].filter((page) => page >= 1 && page <= total));
  const pages = [...wanted].sort((a, b) => a - b);
  const items: PageItem[] = [];
  pages.forEach((page, index) => {
    const previous = pages[index - 1];
    if (previous !== undefined) {
      if (page - previous === 2) items.push(previous + 1);
      else if (page - previous > 2) items.push("…");
    }
    items.push(page);
  });
  return items;
}
