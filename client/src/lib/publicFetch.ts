import { unstable_rethrow } from "next/navigation";
import type { Page } from "@/types/api";
import { describeFailure } from "./fetchFailure";

// Les lectures publiques des Server Components : appel direct de l'API (API_URL), à chaque
// visite (`cache: "no-store"`, décision de Mehdi du 05/11). Avant, chaque réponse était
// gardée 60 s (300 s pour les catégories) : un produit publié dans le back-office pouvait
// mettre une minute, et un rechargement de plus, à apparaître. Le panier et la commande
// revérifient de toute façon prix et stock dans l'API.
// Dans un même rendu, Next ne fait qu'un appel par adresse, même demandée par plusieurs
// composants (la mémoïsation des requêtes ne dépend pas du cache).
// Renvoie null si l'API ne répond pas, pour que la page affiche un message au lieu de planter.
// Chaque échec laisse une ligne dans les logs (Vercel > Logs) : voir fetchFailure.ts.
async function readBody<T>(path: string): Promise<T | null> {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${process.env.API_URL}${path}`, { cache: "no-store" });
    if (!response.ok) {
      console.error(describeFailure(path, { status: response.status }, performance.now() - startedAt));
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    // Les erreurs internes de Next (rendu dynamique, redirect) doivent remonter :
    // les avaler figerait la page (piège vu le 24/10 avec l'export statique).
    unstable_rethrow(error);
    console.error(describeFailure(path, { error }, performance.now() - startedAt));
    return null;
  }
}

export async function publicFetch<T>(path: string): Promise<T | null> {
  const body = await readBody<{ data: T }>(path);
  return body ? body.data : null;
}

// Même chose pour une liste paginée : { data, pagination }.
export async function publicFetchPage<T>(path: string): Promise<Page<T> | null> {
  return readBody<Page<T>>(path);
}
