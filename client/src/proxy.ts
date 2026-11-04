import { NextResponse, type NextRequest } from "next/server";
import { catalogRedirect } from "@/lib/legacyRedirect";

export function proxy(request: NextRequest) {
  // La page de tous les produits n'existe plus : /produits sans affaires, recherche ni
  // modèle part vers la Boutique par une vraie redirection, avant tout rendu (la page
  // garde la même règle en secours).
  if (request.nextUrl.pathname === "/produits") {
    const target = catalogRedirect(request.nextUrl.searchParams);
    return target ? NextResponse.redirect(new URL(target, request.url)) : NextResponse.next();
  }

  // Première des trois couches de protection : sans cookie de connexion, /compte et
  // /admin renvoient tout de suite vers /connexion. Le proxy ne vérifie pas le jeton
  // (il ne connaît pas le secret) : le layout le fait côté serveur, puis l'API à
  // chaque requête. C'est l'API qui protège vraiment les données.
  if (!request.cookies.has("token")) {
    const login = new URL("/connexion", request.url);
    login.searchParams.set("suite", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/produits", "/compte/:path*", "/admin/:path*"],
};
