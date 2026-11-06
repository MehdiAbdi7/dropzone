// `suite` : la page demandée avant la redirection vers /connexion (posée par proxy.ts).
// Seule une page de la boutique est acceptée, jamais une adresse d'un autre site : sinon,
// un lien de connexion piégé emmènerait le client ailleurs une fois connecté (une
// « redirection ouverte »).
// Plutôt que de deviner à la main les adresses dangereuses, on laisse `new URL` les lire
// comme le navigateur (06/11) : il change « \ » en « / » et retire les tabulations, donc
// « /\pirate.example » devient « //pirate.example », un autre site. Ce qui ne reste pas sur
// la même origine (protocole, domaine, port) est refusé.
export function safeNext(suite: string | undefined, isAdmin: boolean, origin: string): string {
  const fallback = isAdmin ? "/admin" : "/compte";
  if (!suite?.startsWith("/")) {
    return fallback;
  }
  // `new URL` dans un try plutôt que `URL.parse` : URL.parse n'existe que depuis Safari 18,
  // la connexion planterait sur un iPhone plus ancien.
  let url: URL;
  try {
    url = new URL(suite, origin);
  } catch {
    return fallback;
  }
  if (url.origin !== origin) {
    return fallback;
  }
  return url.pathname + url.search + url.hash;
}
