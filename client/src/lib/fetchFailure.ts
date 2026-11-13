// La ligne écrite dans les logs quand une lecture publique de l'API échoue (13/11).
// Avant, publicFetch avalait l'erreur sans trace : on voyait « Le catalogue ne répond pas »
// sans pouvoir dire si l'API avait répondu 500, 502 (Render qui démarre) ou rien du tout.
// `outcome` : la réponse reçue (son code), ou l'erreur levée par fetch (réseau, délai).
export function describeFailure(
  path: string,
  outcome: { status: number } | { error: unknown },
  elapsedMs: number,
): string {
  const reason = "status" in outcome ? `réponse ${outcome.status}` : `erreur ${errorText(outcome.error)}`;
  return `[publicFetch] échec GET ${path} : ${reason} après ${Math.round(elapsedMs)} ms`;
}

// Node range la vraie raison d'un « fetch failed » dans `cause`. Son message peut être vide
// (AggregateError d'une connexion refusée) : la raison est alors dans `code` (ECONNREFUSED,
// ETIMEDOUT, UND_ERR_CONNECT_TIMEOUT…).
function errorText(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  if (!(error.cause instanceof Error)) return error.message;
  const { code } = error.cause as Error & { code?: unknown };
  const reason = error.cause.message || (typeof code === "string" ? code : error.cause.name);
  return `${error.message} (${reason})`;
}
