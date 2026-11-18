// Le prix d'achat d'une pièce après un arrivage (18/11) : la moyenne pondérée de ce qu'il y a déjà et de ce qui
// arrive, arrondie au dinar. Une pièce reçue à des prix différents, ou récupérée sur un appareil démonté à 0 DA,
// garde ainsi UN seul prix d'achat, celui qui sert au coût de la prochaine réparation.
// Sans stock, le prix devient celui de l'arrivage (même 0) : il n'y a rien à moyenner, et diviser par le stock
// de départ ne serait pas défini. L'API borne les prix (10 000 000) et la quantité (10 000), donc le produit
// reste très loin de la limite des entiers.
export function weightedAveragePrice(
  current: { stock: number; price: number },
  arrival: { quantity: number; unitCost: number },
): number {
  if (current.stock === 0) return arrival.unitCost;
  const total = current.stock * current.price + arrival.quantity * arrival.unitCost;
  return Math.round(total / (current.stock + arrival.quantity));
}
