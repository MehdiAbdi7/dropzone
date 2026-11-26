import { describe, expect, it, vi } from "vitest";
import { drainSoldMediaPurges, purgeSoldMediaMiddleware } from "../src/middlewares/purgeSoldMedia.js";

// La suppression des médias part APRÈS la réponse (elle ne ralentit jamais le client). Un test qui enchaîne sur le suivant
// pendant qu'elle tourne encore vide les tables en même temps qu'elle les lit : « deadlock detected » (CI du 26/11, sur main).
// `drainSoldMediaPurges` permet d'attendre que toutes les suppressions en cours soient finies avant de vider la base.
function request(method: string, statusCode: number, purge: () => Promise<number>) {
  let finish: () => void = () => {};
  const res = { statusCode, on: (_event: string, handler: () => void) => (finish = handler) };
  const next = vi.fn();
  purgeSoldMediaMiddleware(purge)({ method } as never, res as never, next);
  return { finish, next };
}

describe("purgeSoldMediaMiddleware", () => {
  it("lance la suppression après la réponse d'une écriture réussie", async () => {
    const purge = vi.fn(async () => 0);
    const { finish, next } = request("POST", 201, purge);

    expect(next).toHaveBeenCalledTimes(1);
    expect(purge).not.toHaveBeenCalled();
    finish();
    await drainSoldMediaPurges();
    expect(purge).toHaveBeenCalledTimes(1);
  });

  it("ne lance rien pour une lecture", async () => {
    const purge = vi.fn(async () => 0);
    const { finish } = request("GET", 200, purge);

    finish();
    await drainSoldMediaPurges();

    expect(purge).not.toHaveBeenCalled();
  });

  it("ne lance rien quand l'écriture a échoué", async () => {
    const purge = vi.fn(async () => 0);
    const { finish } = request("POST", 409, purge);

    finish();
    await drainSoldMediaPurges();

    expect(purge).not.toHaveBeenCalled();
  });
});

describe("drainSoldMediaPurges", () => {
  it("n'attend rien quand aucune suppression n'est en cours", async () => {
    await expect(drainSoldMediaPurges()).resolves.toBeUndefined();
  });

  it("attend la fin d'une suppression en cours", async () => {
    let end!: () => void;
    const slow = () =>
      new Promise<number>((resolve) => {
        end = () => resolve(0);
      });
    const { finish } = request("PATCH", 200, slow);
    finish();

    let drained = false;
    const waiting = drainSoldMediaPurges().then(() => {
      drained = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(drained).toBe(false);

    end();
    await waiting;
    expect(drained).toBe(true);
  });

  it("finit aussi quand la suppression échoue (l'erreur est journalisée, jamais renvoyée)", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { finish } = request("DELETE", 204, async () => {
      throw new Error("base indisponible");
    });
    finish();

    await expect(drainSoldMediaPurges()).resolves.toBeUndefined();

    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
