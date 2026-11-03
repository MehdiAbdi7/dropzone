// Photos des téléphones : détourage, échelle réelle et envoi sur Cloudinary.
//   npm run photos                    (images rangées dans dropzone/products)
//   npm run photos -- dropzone/test   (pour essayer sans toucher aux vraies)
//
// Lit les photos de client/design-sources/photos (ignoré par Git), nommées comme le
// champ `photo` de PHONES (iphone-15-pro-max.jpg…). Toutes au même angle : dos et face.
//
// L'échelle réelle : chaque image finale a la même toile transparente, où 1 px vaut
// toujours la même longueur. Le téléphone y est réduit à sa hauteur officielle et posé
// en bas. Sans toile commune, `object-contain` remplirait chaque carte de la même façon
// et un Pro paraîtrait aussi grand qu'un Pro Max.
import { readdir } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { env } from "../config/env.js";
import "../config/cloudinary.js";

const PHOTOS_DIR = path.resolve(import.meta.dirname, "../../../client/design-sources/photos");

// 170 mm sur 1200 px : de la marge au-dessus du plus grand téléphone du catalogue
// (Galaxy Z Flip6 ouvert, 165,1 mm). La largeur suffit pour un dos et une face côte à côte.
const CANVAS = { width: 1000, height: 1200, mm: 170 };

// Un produit : son nom sur Cloudinary, la photo qu'il utilise et sa hauteur officielle.
// Deux modèles au même dessin partagent la photo : le Pro reprend celle du Pro Max.
const PHONES: { name: string; photo: string; heightMm: number }[] = [
  { name: "iphone-15-pro-max", photo: "iphone-15-pro-max", heightMm: 159.9 },
  { name: "iphone-15-pro", photo: "iphone-15-pro-max", heightMm: 146.6 },
];

if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
  console.error("Les variables CLOUDINARY_* manquent dans le .env.");
  process.exit(1);
}

const folder = process.argv[2] ?? "dropzone/products";
const files = await readdir(PHOTOS_DIR);

// 1. Le détourage, une fois par photo : le résultat recadré au plus près du téléphone
//    est gardé dans cutouts/, pour refaire les images finales sans repayer le détourage.
async function cutOut(photo: string): Promise<UploadApiResponse | null> {
  const file = files.find((f) => path.parse(f).name === photo);
  if (!file) {
    console.warn(`Photo absente : ${photo} (dans ${PHOTOS_DIR})`);
    return null;
  }
  const sourceId = `${folder}/sources/${photo}`;
  const source = await cloudinary.uploader.upload(path.join(PHOTOS_DIR, file), {
    public_id: sourceId,
    overwrite: true,
    eager: [{ effect: "background_removal", format: "png" }],
    eager_async: true,
  });

  // Le détourage tourne en arrière-plan : son adresse répond 423 tant qu'il n'est pas prêt.
  const removedUrl = cloudinary.url(sourceId, {
    version: source.version,
    transformation: [{ effect: "background_removal" }],
    format: "png",
  });
  for (let i = 0; i < 30; i++) {
    if ((await fetch(removedUrl, { method: "HEAD" })).ok) break;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  const cutout = await cloudinary.uploader.upload(removedUrl, {
    public_id: `${folder}/cutouts/${photo}`,
    overwrite: true,
    transformation: [{ effect: "trim" }],
    format: "png",
  });
  // L'original reste sur le PC : inutile de le garder chez Cloudinary.
  await cloudinary.uploader.destroy(sourceId, { invalidate: true });
  return cutout;
}

const cutouts = new Map<string, UploadApiResponse | null>();
const urls: Record<string, string> = {};

for (const phone of PHONES) {
  if (!cutouts.has(phone.photo)) {
    cutouts.set(phone.photo, await cutOut(phone.photo));
  }
  const cutout = cutouts.get(phone.photo);
  if (!cutout) continue;

  // 2. L'échelle réelle : la hauteur en pixels suit la hauteur en millimètres.
  const height = Math.round((phone.heightMm / CANVAS.mm) * CANVAS.height);
  const width = Math.round((cutout.width * height) / cutout.height);
  if (width > CANVAS.width) {
    // `lpad` réduirait l'image pour la faire entrer, et l'échelle serait fausse.
    console.warn(`${phone.name} : ${width} px de large, plus que la toile (${CANVAS.width} px)`);
    continue;
  }

  // 3. L'image finale : réduite, posée en bas d'une toile transparente, en WebP.
  //    `lpad` et pas `pad` : `pad` agrandirait l'image jusqu'à remplir la toile et
  //    effacerait l'écart de taille ; `lpad` ne fait qu'ajouter du vide autour.
  const final = await cloudinary.uploader.upload(cutout.secure_url, {
    public_id: `${folder}/${phone.name}`,
    overwrite: true,
    invalidate: true,
    transformation: [
      { crop: "scale", height },
      { crop: "lpad", width: CANVAS.width, height: CANVAS.height, gravity: "south", background: "transparent" },
      { quality: "auto" },
    ],
    format: "webp",
  });
  urls[phone.name] = final.secure_url;
  console.log(`${phone.name} : ${height} px de haut, ${Math.round(final.bytes / 1024)} Ko`);
}

// Les adresses à recopier dans le front et le seed.
console.log(JSON.stringify(urls, null, 2));
