// Ce que la marchandise a coûté au magasin et ce qu'il gagne dessus : jamais montré au vendeur ni au
// responsable commande (lot 7). On retire ces clés, à n'importe quelle profondeur d'une réponse.
// `partsCost` : ce que les pièces d'une réparation ont coûté (atelier, étape 3).
const COST_KEYS = new Set(["unitCost", "purchasePrice", "profit", "margin", "partsCost"]);

// Ce que le technicien garde (atelier, étape 5) : le prix d'achat des pièces, jamais le bénéfice ni la marge. Depuis le
// 21/11 il voit aussi l'argent du client (main-d'œuvre, prix, total) : ce n'est pas un coût, rien n'est retiré.
export const TECHNICIAN_COST_KEYS: ReadonlySet<string> = new Set(["unitCost", "purchasePrice", "partsCost"]);

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
