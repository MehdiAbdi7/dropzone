// Ce que la marchandise a coûté au magasin et ce qu'il gagne dessus : jamais montré au vendeur ni au
// responsable commande (lot 7). On retire ces clés, à n'importe quelle profondeur d'une réponse.
// `partsCost` : ce que les pièces d'une réparation ont coûté (atelier, étape 3).
const COST_KEYS = new Set(["unitCost", "purchasePrice", "profit", "margin", "partsCost"]);

// Ce que le technicien garde (atelier, étape 5) : le prix d'achat des pièces, jamais le bénéfice ni la marge.
export const TECHNICIAN_COST_KEYS: ReadonlySet<string> = new Set(["unitCost", "purchasePrice", "partsCost"]);

// L'argent du client dans l'atelier : retiré des réponses du technicien (il voit les pièces et leur coût, pas ce que
// le client paie).
export const CLIENT_MONEY_KEYS: ReadonlySet<string> = new Set(["laborPrice", "unitPrice", "total", "amountDue", "paidAmount", "payMethod", "price", "profit", "margin"]);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;

// Retire des clés, à n'importe quelle profondeur. Les dates et les autres objets (Buffer…) restent tels quels : seuls
// les tableaux et les objets simples sont parcourus.
export function withoutKeys<T>(payload: T, keys: ReadonlySet<string>): T {
  if (Array.isArray(payload)) {
    return payload.map((item) => withoutKeys(item, keys)) as T;
  }
  if (isPlainObject(payload)) {
    return Object.fromEntries(
      Object.entries(payload)
        .filter(([key]) => !keys.has(key))
        .map(([key, value]) => [key, withoutKeys(value, keys)]),
    ) as T;
  }
  return payload;
}

// Retire les coûts et les bénéfices ; `keep` : des clés de coût à garder (le prix d'achat des pièces pour le technicien).
// Le bénéfice et la marge sont retirés quoi qu'il arrive.
export function withoutCosts<T>(payload: T, keep: ReadonlySet<string> = new Set()): T {
  return withoutKeys(payload, new Set([...COST_KEYS].filter((key) => !keep.has(key) || key === "profit" || key === "margin")));
}
