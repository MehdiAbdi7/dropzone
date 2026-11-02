import type { ApiError } from "@/types/api";

// Le message d'erreur de l'API ({ error: { message } }), ou un message par défaut.
export function errorMessage(error: unknown, fallback = "Une erreur est survenue, réessayez."): string {
  const apiError = error as ApiError | undefined;
  return apiError?.data?.error?.message ?? fallback;
}

// Les erreurs de champ renvoyées par Zod côté serveur : { password: ["8 caractères au minimum"] }.
export function fieldErrors(error: unknown): Record<string, string[]> {
  const details = (error as ApiError | undefined)?.data?.error?.details;
  return details && typeof details === "object" ? (details as Record<string, string[]>) : {};
}
