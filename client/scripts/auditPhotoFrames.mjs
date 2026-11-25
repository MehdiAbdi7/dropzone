// Contrôle des photos de couleur et de modèle (25/11) : les cadres de photos de même taille
// (features/shop/photos.ts) ne valent que si chaque téléphone est une image transparente dont la
// composition rentre dans son cadre. Ce script le vérifie sur toute la boutique.
//
// Il ne fait que LIRE : l'API publique (catégories, séries, produits) puis les photos elles-mêmes.
// Aucune écriture, ni dans la base, ni sur Cloudinary.
//
// Lancer (dans client/, l'API doit tourner) :
//   API=http://localhost:5100 node scripts/auditPhotoFrames.mjs
//   API=http://localhost:5100 node scripts/auditPhotoFrames.mjs --limit=3   (essai court : 3 séries)
//
// Pour chaque photo : le rapport largeur sur hauteur de la zone non transparente (celle que
// `e_trim` garde), et si l'image a de la transparence. Le cadre doit être plus large que la
// composition la plus large, sinon cette photo sera un peu plus petite que les autres.
import sharp from "sharp";

const API = process.env.API ?? "http://localhost:5100";
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : Number.POSITIVE_INFINITY;
const DEVICE_KINDS = ["phone", "tablet", "laptop", "watch"];
// Les cadres à tester (portrait pour les couleurs, large pour les modèles) : voir features/shop/photos.ts.
const FRAME_LIMITS = { couleur: 0.9, modele: 1.6 };
const ALPHA_MIN = 12;

async function get(path) {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) {
    throw new Error(`${path} : ${response.status}`);
  }
  return (await response.json()).data;
}

// Toutes les photos des appareils : { url, family, where }, sans doublon d'adresse.
async function collectPhotos() {
  const photos = new Map();
  const add = (url, family, where) => {
    if (url && url.startsWith("https://") && !url.endsWith(".svg") && !photos.has(url)) {
      photos.set(url, { url, family, where });
    }
  };
  let seriesSeen = 0;
  const categories = await get("/categories");
  for (const category of categories.filter((one) => DEVICE_KINDS.includes(one.kind))) {
    const groups = await get(`/series?category=${category.slug}`);
    for (const group of groups) {
      for (const series of group.series) {
        if (seriesSeen >= LIMIT) {
          return [...photos.values()];
        }
        seriesSeen += 1;
        const poster = await get(`/series/${category.slug}/${group.brand.slug}/${series.slug}`);
        for (const model of poster.models) {
          add(model.image, "modele", `${category.slug}/${series.slug}/${model.name}`);
          if (model.productSlug) {
            const product = await get(`/products/${model.productSlug}`);
            for (const color of product.colors) {
              add(color.photoUrl, "couleur", `${model.productSlug}/${color.name}`);
            }
          }
        }
      }
    }
  }
  return [...photos.values()];
}

// La zone non transparente d'une image : sa taille et son rapport largeur sur hauteur.
async function measure(photo) {
  const response = await fetch(photo.url);
  if (!response.ok) {
    return { ...photo, error: `HTTP ${response.status}` };
  }
  const { data, info } = await sharp(Buffer.from(await response.arrayBuffer()))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let opaque = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + info.channels - 1];
      if (alpha === 255) opaque += 1;
      if (alpha > ALPHA_MIN) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) {
    return { ...photo, error: "image vide" };
  }
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  return {
    ...photo,
    canvas: `${info.width}x${info.height}`,
    shortSide: Math.min(info.width, info.height),
    transparent: opaque < info.width * info.height * 0.98,
    height,
    aspect: width / height,
  };
}

// Quelques mesures en parallèle, pas toutes à la fois : la boutique en ligne n'a pas à être mise à l'épreuve.
async function mapLimit(items, size, work) {
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const index = next;
        next += 1;
        results[index] = await work(items[index]);
      }
    }),
  );
  return results;
}

function report(family, rows) {
  const ok = rows.filter((row) => !row.error);
  const errors = rows.filter((row) => row.error);
  const notTransparent = ok.filter((row) => !row.transparent);
  const limit = FRAME_LIMITS[family];
  const tooWide = ok.filter((row) => row.aspect > limit);
  const aspects = ok.map((row) => row.aspect);
  const smallest = ok.reduce((min, row) => (row.height < min.height ? row : min), ok[0]);
  console.log(`\n=== ${family === "couleur" ? "Photos de couleur" : "Photos de modèle"} : ${rows.length} ===`);
  if (ok.length === 0) {
    console.log("aucune photo mesurée");
    return;
  }
  console.log(`rapport largeur sur hauteur : de ${Math.min(...aspects).toFixed(2)} à ${Math.max(...aspects).toFixed(2)} (cadre prévu : jusqu'à ${limit})`);
  console.log(`la plus petite zone de téléphone : ${smallest.height} px de haut (${smallest.where}, image ${smallest.canvas})`);
  console.log(`sans transparence (le recadrage ne ferait rien) : ${notTransparent.length}`);
  notTransparent.slice(0, 15).forEach((row) => console.log(`  - ${row.where}`));
  console.log(`plus larges que le cadre : ${tooWide.length}`);
  tooWide.slice(0, 15).forEach((row) => console.log(`  - ${row.where} (rapport ${row.aspect.toFixed(2)})`));
  console.log(`photos illisibles : ${errors.length}`);
  errors.slice(0, 15).forEach((row) => console.log(`  - ${row.where} : ${row.error}`));
}

const photos = await collectPhotos();
console.log(`${photos.length} photos à mesurer (API ${API}${Number.isFinite(LIMIT) ? `, ${LIMIT} séries` : ""})`);
const rows = await mapLimit(photos, 6, (photo) => measure(photo).catch((error) => ({ ...photo, error: String(error) })));
report("couleur", rows.filter((row) => row.family === "couleur"));
report("modele", rows.filter((row) => row.family === "modele"));
