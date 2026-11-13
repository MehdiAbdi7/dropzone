import type { CartItem, CartLine, CartPreview, Condition, Options } from "@/types/api";

// Le panier gardé dans le navigateur (13/11, demande de Mehdi : « comme Niwa »).
//
// Avant, localStorage ne gardait que le SKU et la quantité : pour afficher le moindre nom ou la
// moindre photo, il fallait attendre l'aperçu du serveur. Quand Render dort, la barre du panier
// restait absente et la fenêtre affichait « Calcul des prix… » pendant près d'une minute.
//
// Maintenant, chaque article garde aussi sa DESCRIPTION (nom, photo, options, état, garantie),
// recopiée depuis la dernière réponse du serveur. Le panier s'affiche donc tout de suite.
// Le PRIX, lui, n'est jamais gardé (règle de Mehdi) : il vient toujours de l'aperçu du serveur,
// pour qu'un client ne voie jamais un ancien prix. En attendant la réponse, une roue.

// La description d'une ligne : tout ce qui se montre, sauf les prix et les quantités.
export type LineSnapshot = {
  name: string;
  slug: string;
  image: string | null;
  options: Options;
  condition: Condition;
  conditionReport: string | null;
  warrantyMonths?: number | null;
};

// Un article du panier du navigateur. `snapshot` est absent tant que le serveur n'a jamais
// répondu pour cet article (ajouté à l'instant, ou panier écrit par l'ancienne version).
export type StoredCartItem = CartItem & { snapshot?: LineSnapshot };

// On recopie champ par champ, au lieu de garder la ligne entière : c'est ce qui garantit
// qu'aucun prix ne se retrouve dans localStorage.
export function snapshotOf(line: CartLine): LineSnapshot {
  return {
    name: line.name,
    slug: line.slug,
    image: line.image,
    options: line.options,
    condition: line.condition,
    conditionReport: line.conditionReport,
    warrantyMonths: line.warrantyMonths ?? null,
  };
}

// Ce qui part au serveur : le SKU et la quantité, rien d'autre. C'est aussi la clé du cache
// de l'aperçu (RTK Query) : sans ce tri, recopier une description changerait la clé et
// relancerait l'appel pour rien.
export function toRequest(items: StoredCartItem[]): CartItem[] {
  return items.map(({ sku, quantity }) => ({ sku, quantity }));
}

const isText = (value: unknown): value is string => typeof value === "string";
const isTextOrNull = (value: unknown) => value === null || isText(value);

function readSnapshot(value: unknown): LineSnapshot | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const s = value as Record<string, unknown>;
  const options = s.options;
  const validOptions =
    typeof options === "object" && options !== null && !Array.isArray(options) && Object.values(options).every(isText);
  const validWarranty = s.warrantyMonths === undefined || s.warrantyMonths === null || typeof s.warrantyMonths === "number";
  if (
    !isText(s.name) ||
    !isText(s.slug) ||
    !isTextOrNull(s.image) ||
    !validOptions ||
    (s.condition !== "new" && s.condition !== "refurbished") ||
    !isTextOrNull(s.conditionReport) ||
    !validWarranty
  ) {
    return undefined;
  }
  // Reconstruit plutôt que renvoyé tel quel : un champ en trop (un prix écrit à la main) tombe.
  return {
    name: s.name,
    slug: s.slug,
    image: s.image as string | null,
    options: options as Options,
    condition: s.condition,
    conditionReport: s.conditionReport as string | null,
    warrantyMonths: (s.warrantyMonths as number | null | undefined) ?? null,
  };
}

// Relit le panier gardé. Ce texte vient du disque du client, donc de l'extérieur : il est
// vérifié avant usage. Un article abîmé est écarté ; une description abîmée est seulement
// oubliée (l'article reste, le serveur la renverra).
export function parseStoredCart(raw: string | null): StoredCartItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw ?? "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((entry): StoredCartItem[] => {
    const item = entry as Record<string, unknown> | null;
    if (!isText(item?.sku) || !Number.isInteger(item.quantity) || (item.quantity as number) <= 0) {
      return [];
    }
    const snapshot = readSnapshot(item.snapshot);
    const base = { sku: item.sku, quantity: item.quantity as number };
    return [snapshot ? { ...base, snapshot } : base];
  });
}

// Une ligne de la fenêtre du panier : la description gardée tout de suite, puis les chiffres
// du serveur dès qu'il a répondu. `lineTotal: null` = prix en cours de calcul (la roue).
export type WindowLine = {
  sku: string;
  quantity: number;
  snapshot: LineSnapshot | null;
  lineTotal: number | null;
  maxQuantity: number | null;
  problem: string | null;
  gifts: CartLine[];
};

export function windowLines(items: StoredCartItem[], preview: CartPreview | undefined): WindowLine[] {
  const unavailable = new Set(preview?.unavailable ?? []);
  return items
    .filter((item) => !unavailable.has(item.sku))
    .map((item) => {
      const confirmed = preview?.lines.find((line) => line.sku === item.sku && !line.isGift);
      return {
        sku: item.sku,
        // La quantité du navigateur : à jour au clic, l'aperçu arrive un aller-retour plus tard.
        quantity: item.quantity,
        snapshot: confirmed ? snapshotOf(confirmed) : (item.snapshot ?? null),
        lineTotal: confirmed?.lineTotal ?? null,
        maxQuantity: confirmed?.maxQuantity ?? null,
        problem: confirmed?.problem ?? null,
        gifts: preview?.lines.filter((line) => line.giftFor === item.sku) ?? [],
      };
    });
}

const THUMBS = 3;

// Les chiffres de la barre : le nombre d'articles et les vignettes viennent du panier gardé
// (tout de suite) ; le total vient du serveur (`null` tant qu'il n'a pas répondu).
// Les cadeaux ne sont pas dans le panier du navigateur : ils ne comptent donc pas.
export function cartBarSummary(
  items: StoredCartItem[],
  preview: CartPreview | undefined,
): { count: number; total: number | null; thumbs: string[]; hidden: number } {
  const withImage = items.flatMap((item) => (item.snapshot?.image ? [item.snapshot.image] : []));
  return {
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    total: preview?.total ?? null,
    thumbs: withImage.slice(0, THUMBS),
    hidden: Math.max(0, items.length - THUMBS),
  };
}
