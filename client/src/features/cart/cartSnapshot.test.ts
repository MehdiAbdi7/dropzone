import { describe, expect, it } from "vitest";
import type { CartLine, CartPreview } from "@/types/api";
import { cartBarSummary, parseStoredCart, snapshotOf, toRequest, windowLines, type StoredCartItem } from "./cartSnapshot";

const line = (sku: string, quantity: number, extra: Partial<CartLine> = {}): CartLine => ({
  sku,
  productId: 1,
  name: `Nom ${sku}`,
  slug: `slug-${sku}`,
  image: `${sku}.webp`,
  options: { Couleur: "Noir" },
  condition: "new",
  conditionReport: null,
  warrantyMonths: 12,
  unitPrice: 1000,
  normalPrice: 1000,
  quantity,
  maxQuantity: 4,
  lineTotal: 1000 * quantity,
  isGift: false,
  giftFor: null,
  problem: null,
  ...extra,
});

const preview = (lines: CartLine[], total: number, unavailable: string[] = []): CartPreview => ({
  lines,
  total,
  unavailable,
  notices: [],
  limitations: [],
  subtotal: total,
  shippingFee: 0,
  canOrder: true,
  cartHash: "h",
});

const stored = (sku: string, quantity: number, withSnapshot = true): StoredCartItem =>
  withSnapshot ? { sku, quantity, snapshot: snapshotOf(line(sku, quantity)) } : { sku, quantity };

describe("snapshotOf", () => {
  // La règle de Mehdi (13/11) : on garde le nom, la photo et le reste, JAMAIS le prix.
  it("garde la description d'une ligne, sans aucun prix", () => {
    const snapshot = snapshotOf(line("IP", 2));
    expect(snapshot).toEqual({
      name: "Nom IP",
      slug: "slug-IP",
      image: "IP.webp",
      options: { Couleur: "Noir" },
      condition: "new",
      conditionReport: null,
      warrantyMonths: 12,
    });
    expect(JSON.stringify(snapshot)).not.toMatch(/price|Price|lineTotal/);
  });
});

describe("toRequest", () => {
  it("n'envoie au serveur que le SKU et la quantité", () => {
    expect(toRequest([stored("IP", 2), stored("B", 1, false)])).toEqual([
      { sku: "IP", quantity: 2 },
      { sku: "B", quantity: 1 },
    ]);
  });
});

describe("parseStoredCart", () => {
  it("relit un panier avec ses descriptions", () => {
    const items = [stored("IP", 2)];
    expect(parseStoredCart(JSON.stringify(items))).toEqual(items);
  });

  it("relit l'ancien format (SKU et quantité seuls)", () => {
    expect(parseStoredCart('[{"sku":"IP","quantity":2}]')).toEqual([{ sku: "IP", quantity: 2 }]);
  });

  it("garde l'article mais oublie une description abîmée", () => {
    expect(parseStoredCart('[{"sku":"IP","quantity":2,"snapshot":{"name":3}}]')).toEqual([{ sku: "IP", quantity: 2 }]);
  });

  it("ne garde jamais un prix écrit dans le stockage", () => {
    const raw = JSON.stringify([{ sku: "IP", quantity: 1, snapshot: { ...snapshotOf(line("IP", 1)), unitPrice: 5 } }]);
    expect(JSON.stringify(parseStoredCart(raw))).not.toMatch(/unitPrice/);
  });

  it("écarte un contenu illisible ou des lignes invalides", () => {
    expect(parseStoredCart(null)).toEqual([]);
    expect(parseStoredCart("pas du json")).toEqual([]);
    expect(parseStoredCart('{"sku":"IP"}')).toEqual([]);
    expect(parseStoredCart('[{"sku":"IP","quantity":0},{"sku":"B","quantity":1.5},{"quantity":1}]')).toEqual([]);
  });
});

describe("windowLines", () => {
  it("montre tout de suite les lignes gardées, sans prix tant que le serveur n'a pas répondu", () => {
    const lines = windowLines([stored("IP", 2), stored("B", 1, false)], undefined);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ sku: "IP", quantity: 2, snapshot: { name: "Nom IP" }, lineTotal: null, gifts: [] });
    expect(lines[1]).toMatchObject({ sku: "B", quantity: 1, snapshot: null, lineTotal: null });
  });

  it("prend le prix, le maximum, le problème et la description du serveur dès sa réponse", () => {
    const fresh = line("IP", 2, { lineTotal: 90000, maxQuantity: 3, problem: "Plus que 1 en stock", name: "Nouveau nom" });
    const gift = line("CHG", 1, { isGift: true, giftFor: "IP", lineTotal: 0 });
    const [first] = windowLines([stored("IP", 2)], preview([fresh, gift], 90000));
    expect(first).toMatchObject({
      lineTotal: 90000,
      maxQuantity: 3,
      problem: "Plus que 1 en stock",
      snapshot: { name: "Nouveau nom" },
    });
    expect(first.gifts.map((g) => g.sku)).toEqual(["CHG"]);
  });

  it("retire des lignes un article que le serveur dit indisponible", () => {
    expect(windowLines([stored("IP", 1), stored("OLD", 1)], preview([line("IP", 1)], 1000, ["OLD"])).map((l) => l.sku)).toEqual([
      "IP",
    ]);
  });

  it("garde la quantité du navigateur (à jour au clic) même si l'aperçu a un temps de retard", () => {
    const [first] = windowLines([stored("IP", 3)], preview([line("IP", 2)], 2000));
    expect(first.quantity).toBe(3);
  });
});

describe("cartBarSummary", () => {
  it("compte les articles et prend 3 vignettes depuis le panier gardé, avant toute réponse", () => {
    const items = [stored("IP", 3), stored("B", 1, false), stored("C", 1), stored("D", 2)];
    expect(cartBarSummary(items, undefined)).toEqual({
      count: 7,
      total: null,
      thumbs: ["IP.webp", "C.webp", "D.webp"],
      hidden: 1,
    });
  });

  it("prend le total du serveur quand il est arrivé", () => {
    expect(cartBarSummary([stored("IP", 1)], preview([line("IP", 1)], 1000)).total).toBe(1000);
  });

  it("vaut zéro article pour un panier vide", () => {
    expect(cartBarSummary([], undefined)).toEqual({ count: 0, total: null, thumbs: [], hidden: 0 });
  });
});
