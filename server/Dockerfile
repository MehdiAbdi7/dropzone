# L'image de l'API, en deux étapes : on compile avec tous les outils, puis on ne
# garde que le JavaScript compilé et les dépendances de production (image plus légère).

# ---------- 1. Compiler ----------
FROM node:22-alpine AS build
WORKDIR /app
# D'abord les fichiers qui listent les dépendances : tant qu'ils ne changent pas,
# Docker réutilise la couche « npm ci » en cache, même si le code change.
COPY package*.json ./
RUN npm ci
COPY . .
# `prisma generate` lit prisma.config.ts, qui attend une adresse de base :
# une valeur factice suffit, generate ne se connecte pas.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npm run build

# ---------- 2. Lancer ----------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
# Pas de root dans le conteneur : l'utilisateur `node` existe déjà dans l'image.
USER node
EXPOSE 5000
CMD ["node", "dist/index.js"]
