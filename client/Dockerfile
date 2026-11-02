# L'image du front. `output: "standalone"` (next.config.ts) produit un dossier
# qui contient le serveur Next et seulement les fichiers de node_modules utiles.

# ---------- 1. Compiler ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Le relais /api de next.config.ts est figé au build : l'adresse de l'API (le nom
# du service dans docker-compose) doit donc être connue ici.
ARG API_URL=http://api:5000
ENV API_URL=$API_URL
RUN npm run build

# ---------- 2. Lancer ----------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
