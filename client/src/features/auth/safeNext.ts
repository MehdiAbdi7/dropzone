// `suite` : la page demandée avant la redirection vers /connexion (posée par proxy.ts).
// Seule une page de la boutique est acceptée, jamais une adresse d'un autre site : sinon,
// un lien de connexion piégé emmènerait le client ailleurs une fois connecté (une
// « redirection ouverte »).
// Plutôt que de deviner à la main les adresses dangereuses, on laisse `new URL` les lire
// comme le navigateur (06/11) : il change « \ » en « / » et retire les tabulations, donc
// « /\pirate.example » devient « //pirate.example », un autre site. Ce qui ne reste pas sur
// la même origine (protocole, domaine, port) est refusé.
// `fallback` : la page où l'on arrive quand aucune page n'est demandée ou que celle demandée est refusée.
// Elle dépend du rôle (homeFor, access.ts) : le vendeur arrive sur la vente, le client sur son compte.
export function safeNext(suite: string | undefined, fallback: string, origin: string): string {
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
  // On contrôle aussi ce qu'on renvoie vraiment : new URL nettoie le chemin, et
  // « /.//pirate.example », « /a/..//pirate.example » ou « /%2e//pirate.example »
  // deviennent « //pirate.example », que le navigateur lirait comme un autre site.
  const path = url.pathname + url.search + url.hash;
  if (path.startsWith("//") || path.startsWith("/\\")) {
    return fallback;
  }
  return path;
}
