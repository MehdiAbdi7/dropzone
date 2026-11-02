import { NextResponse, type NextRequest } from "next/server";

// Première des trois couches de protection : sans cookie de connexion, /compte et
// /admin renvoient tout de suite vers /connexion. Le proxy ne vérifie pas le jeton
// (il ne connaît pas le secret) : le layout le fait côté serveur, puis l'API à
// chaque requête. C'est l'API qui protège vraiment les données.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("token")) {
    const login = new URL("/connexion", request.url);
    login.searchParams.set("suite", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/compte/:path*", "/admin/:path*"],
};
