// Ce que la marchandise a coûté au magasin et ce qu'il gagne dessus : jamais montré au vendeur ni au
// responsable commande (lot 7). On retire ces clés, à n'importe quelle profondeur d'une réponse.
// `partsCost` : ce que les pièces d'une réparation ont coûté (atelier, étape 3).
const COST_KEYS = new Set(["unitCost", "purchasePrice", "profit", "margin", "partsCost"]);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;

// Les dates et les autres objets (Buffer…) restent tels quels : seuls les tableaux et les objets simples
// sont parcourus.
export function withoutCosts<T>(payload: T): T {
  if (Array.isArray(payload)) {
    return payload.map((item) => withoutCosts(item)) as T;
  }
  if (isPlainObject(payload)) {
    return Object.fromEntries(
      Object.entries(payload)
        .filter(([key]) => !COST_KEYS.has(key))
        .map(([key, value]) => [key, withoutCosts(value)]),
    ) as T;
  }
  return payload;
}
