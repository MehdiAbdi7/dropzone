import { describe, expect, it } from "vitest";
import { amountInWords } from "../src/modules/invoices/amountInWords.js";

// Le total en lettres d'une facture (lot 6) : les règles du français, qui sont les pièges (« quatre-vingts »
// prend un s seulement s'il ne reste rien derrière, « cent » aussi, « mille » ne varie jamais).
describe("amountInWords", () => {
  it.each([
    [0, "zéro dinar algérien"],
    [1, "un dinar algérien"],
    [2, "deux dinars algériens"],
    [16, "seize dinars algériens"],
    [17, "dix-sept dinars algériens"],
    [21, "vingt et un dinars algériens"],
    [22, "vingt-deux dinars algériens"],
    [71, "soixante et onze dinars algériens"],
    [75, "soixante-quinze dinars algériens"],
    [80, "quatre-vingts dinars algériens"],
    [81, "quatre-vingt-un dinars algériens"],
    [91, "quatre-vingt-onze dinars algériens"],
    [99, "quatre-vingt-dix-neuf dinars algériens"],
  ])("%i → %s", (value, words) => {
    expect(amountInWords(value)).toBe(words);
  });

  it.each([
    [100, "cent dinars algériens"],
    [101, "cent un dinars algériens"],
    [200, "deux cents dinars algériens"],
    [201, "deux cent un dinars algériens"],
    [380, "trois cent quatre-vingts dinars algériens"],
    [999, "neuf cent quatre-vingt-dix-neuf dinars algériens"],
  ])("%i → %s", (value, words) => {
    expect(amountInWords(value)).toBe(words);
  });

  it.each([
    [1_000, "mille dinars algériens"],
    [1_001, "mille un dinars algériens"],
    [2_000, "deux mille dinars algériens"],
    [21_000, "vingt et un mille dinars algériens"],
    // « mille » ne varie jamais, et « quatre-vingt » ni « cent » n'y prennent de s.
    [80_000, "quatre-vingt mille dinars algériens"],
    [200_000, "deux cent mille dinars algériens"],
    [150_000, "cent cinquante mille dinars algériens"],
    [245_000, "deux cent quarante-cinq mille dinars algériens"],
    [299_000, "deux cent quatre-vingt-dix-neuf mille dinars algériens"],
    [10_000_000, "dix millions de dinars algériens"],
  ])("%i → %s", (value, words) => {
    expect(amountInWords(value)).toBe(words);
  });

  it.each([
    [1_000_000, "un million de dinars algériens"],
    [2_000_000, "deux millions de dinars algériens"],
    [2_000_001, "deux millions un dinars algériens"],
    [1_280_000, "un million deux cent quatre-vingt mille dinars algériens"],
    [2_000_000_000, "deux milliards de dinars algériens"],
  ])("%i → %s", (value, words) => {
    expect(amountInWords(value)).toBe(words);
  });

  it("refuse ce qui n'est pas un montant en dinars entiers", () => {
    for (const value of [-1, 1.5, Number.NaN, 3_000_000_000]) {
      expect(() => amountInWords(value), String(value)).toThrow();
    }
  });
});
