import type { NextConfig } from "next";

// Les en-têtes de sécurité de toutes les pages (l'API a les siens avec helmet). La CSP se
// limite à ce qui ne gêne pas les scripts en ligne de Next : interdire d'afficher le site
// dans un cadre (clickjacking), les <base> et <object>, et les formulaires vers un autre site.
// HSTS est déjà envoyé par Vercel.
const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  // Un dossier autonome pour l'image Docker (client/Dockerfile). Sans effet sur Vercel.
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL}/:path*`,
      },
    ];
  },
  // L'ancienne page des reconditionnés d'un modèle (avant le 03/11) : aucun lien partagé
  // ne tombe sur une page 404. Les anciens filtres du catalogue sont redirigés par la page.
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async redirects() {
    return [
      {
        source: "/produits/:slug/reconditionne",
        destination: "/produits/:slug/affaire",
        permanent: true,
      },
    ];
  },
  // Les photos envoyées depuis le back-office sont servies par Cloudinary.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
