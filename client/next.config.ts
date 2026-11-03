import type { NextConfig } from "next";

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
