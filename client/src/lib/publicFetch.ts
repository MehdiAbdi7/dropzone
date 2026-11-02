import { unstable_rethrow } from "next/navigation";
import type { Page } from "@/types/api";

// Les lectures publiques des Server Components : appel direct de l'API (API_URL),
// mises en cache `revalidate` secondes. Renvoie null si l'API ne répond pas,
// pour que la page affiche un message au lieu de planter.
export async function publicFetch<T>(
  path: string,
  revalidate?: number,
): Promise<T | null> {
  try {
    const response = await fetch(`${process.env.API_URL}${path}`, {
      next: { revalidate },
    });

    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as { data: T };
    return body.data;
  } catch (error) {
    // Les erreurs internes de Next (rendu dynamique, redirect) doivent remonter :
    // les avaler figerait la page (piège vu le 24/10 avec l'export statique).
    unstable_rethrow(error);
    return null;
  }
}

// Même chose pour une liste paginée : { data, pagination }.
export async function publicFetchPage<T>(path: string, revalidate?: number): Promise<Page<T> | null> {
  try {
    const response = await fetch(`${process.env.API_URL}${path}`, { next: { revalidate } });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as Page<T>;
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}
