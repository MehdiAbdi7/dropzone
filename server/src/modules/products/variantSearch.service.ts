import { prisma } from "../../config/db.js";
import { Prisma, type Condition } from "../../generated/prisma/client.js";
import { SELLABLE, buildConditionReport } from "./product.service.js";
import { variantImage } from "./variantImage.js";

// Le sélecteur de variantes du comptoir (16/11, lot 3) : le vendeur tape quelques mots ou un SKU
// et choisit l'appareil exact. N'offre que ce qui se vend (produit publié, en stock) et ne
// montre le prix d'achat qu'à l'admin, au vendeur et au responsable (la limite de la négociation).
//
// Recherche par mots (17/11) : « coque iphone » trouve « Coque silicone iPhone 15 ». Chaque mot
// tapé doit se retrouver quelque part dans le texte de la variante (nom du produit, SKU, valeurs
// des options comme « 256 Go »), dans n'importe quel ordre. Un mot se retrouve de trois façons :
//   1. tel quel dans le texte (« iphone » dans « iphone 15 ») ;
//   2. dans le texte sans espaces ni tirets (« iphone15 » ou « promax » dans « iphone 15 pro max ») ;
//   3. à une lettre doublée près (« sillicone » pour « silicone »).
export type VariantHit = {
  sku: string;
  // Le produit de la variante : le remplacement sous garantie compare « même modèle » par produit et stockage.
  productId: number;
  productName: string;
  options: Prisma.JsonValue;
  condition: Condition;
  price: number;
  stock: number;
  conditionReport: string | null;
  image: string | null;
  // La fiche complète (18/11) : le bouton « Détail » de la vente l'affiche sans autre appel.
  grade: number | null;
  batteryHealth: number | null;
  replacedParts: string[];
  compatibleParts: string[];
  defects: string[];
  limitations: string[];
  withBox: boolean | null;
  details: string | null;
  warrantyMonths: number | null;
  origin: string | null;
  reference: string | null;
  // Le prix d'achat : l'admin le reçoit toujours, le vendeur seulement par cette route (access.ts).
  purchasePrice: number | null;
  gifts: { name: string; quantity: number }[];
};

// Sans accents ni majuscules : « Écouteurs » devient « ecouteurs ». Le même passage des deux côtés
// (la recherche en JavaScript, le texte de la base par `translate` en SQL) fait qu'on trouve
// « Câble » en tapant « cable ». PostgreSQL n'a pas `unaccent` d'office : on liste les lettres.
const ACCENTED = "àâäçéèêëîïôöùûüÿ";
const PLAIN = "aaaceeeeiioouuuy";
const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

// `%` et `_` sont des jokers de LIKE : on les neutralise pour qu'ils ne cherchent que ces caractères.
const escapeLike = (text: string) => text.replace(/[\\%_]/g, (character) => `\\${character}`);

// Les lettres doublées d'affilée comptent pour une seule : « sillicone » et « silicone » deviennent
// pareils. Seulement les lettres : « 11 » et « 15 » ne doivent pas se confondre.
const collapseLetters = (text: string) => text.replace(/([a-z])\1+/g, "$1");
const compact = (text: string) => text.replace(/[^a-z0-9]/g, "");

// Au plus 8 mots : au-delà, la requête SQL n'apporte rien de plus.
const MAX_WORDS = 8;
// Les espaces et les tirets séparent les mots : « iphone-15 pro » = « iphone 15 pro ».
const wordsOf = (needle: string) => needle.split(/[\s\-–/]+/).filter(Boolean).slice(0, MAX_WORDS);

// La condition SQL d'un mot : l'une des trois façons de le retrouver dans `t.text` (le texte
// normalisé de la variante), `t.compact` (le même sans espaces ni ponctuation) et `t.collapsed`
// (le même sans lettres doublées). Un mot avec `%` ou `_` ne cherche que le caractère lui-même :
// les formes 2 et 3 ne sont proposées qu'aux mots faits de lettres et de chiffres.
function wordCondition(word: string): Prisma.Sql {
  const plain = Prisma.sql`t.text LIKE ${`%${escapeLike(word)}%`} ESCAPE '\\'`;
  if (!/^[a-z0-9]+$/.test(word)) return Prisma.sql`(${plain})`;
  return Prisma.sql`(
    ${plain}
    OR t.compact LIKE ${`%${word}%`}
    OR t.collapsed LIKE ${`%${collapseLetters(word)}%`}
  )`;
}

// 0 : le SKU exact ; 1 : un nom qui commence par la recherche ; 2 : un nom qui contient tous les
// mots ; 3 : le reste (les mots se trouvent dans le SKU ou les options).
function rank(hit: { sku: string; productName: string }, needle: string, words: string[]): number {
  if (normalize(hit.sku) === needle) return 0;
  const name = normalize(hit.productName);
  if (name.startsWith(needle)) return 1;
  return words.every((word) => name.includes(word)) ? 2 : 3;
}

export type VariantSearch = { q: string; category?: string; condition?: Condition; limit?: number };

// `hits` : les `limit` meilleurs résultats ; `total` : combien de variantes correspondent en tout
// (jusqu'à 3000), pour que le vendeur sache quand il doit préciser sa recherche ou en afficher plus.
export async function searchVariants({
  q,
  category,
  condition,
  limit = 50,
}: VariantSearch): Promise<{ hits: VariantHit[]; total: number }> {
  const needle = normalize(q).trim();
  const words = wordsOf(needle);
  // Sans mot (ni filtre) : tout ce qui se vend, rangé par nom. Les mots s'ajoutent au filtre.
  const conditions: Prisma.Sql[] = [
    Prisma.sql`s.stock > 0`,
    Prisma.sql`s.status = 'published'`,
    ...(category ? [Prisma.sql`s.category_slug = ${category}`] : []),
    ...(condition ? [Prisma.sql`s.condition::text = ${condition}`] : []),
    ...words.map(wordCondition),
  ];
  // Les variantes qui correspondent (publiées, en stock), choisies en SQL. 3000 au plus : une borne
  // large avant le tri de pertinence, qui se fait en JavaScript. `text` rassemble de quoi se
  // reconnaître : le nom, le SKU, la catégorie, la marque (« Samsung » trouve un Galaxy dont le nom
  // ne le dit pas), le modèle et les valeurs des options (« 256 Go »), jamais leurs intitulés.
  const matches = await prisma.$queryRaw<{ id: number }[]>`
    SELECT t.id
    FROM (
      SELECT
        v.id,
        v.stock,
        v.condition,
        p.status,
        c.slug AS category_slug,
        translate(
          lower(concat_ws(' ', p.name, v.sku, c.name, b.name, b.maker_name, dm.brand, dm.name, am.name, o.values)),
          ${ACCENTED}, ${PLAIN}
        ) AS text
      FROM product_variants v
      JOIN products p ON p.id = v.product_id
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN device_models dm ON dm.id = p.device_model_id
      LEFT JOIN accessory_makers am ON am.id = p.maker_id
      LEFT JOIN LATERAL (
        SELECT string_agg(e.value, ' ') AS values FROM jsonb_each_text(v.options) e
      ) o ON true
    ) s
    CROSS JOIN LATERAL (
      SELECT
        s.id,
        s.text,
        regexp_replace(s.text, '[^a-z0-9]', '', 'g') AS compact,
        regexp_replace(s.text, '([a-z])\\1+', '\\1', 'g') AS collapsed
    ) t
    WHERE ${Prisma.join(conditions, " AND ")}
    LIMIT 3000`;
  const variants = await prisma.productVariant.findMany({
    // Une variante en brouillon n'est pas à vendre (23/11) : le comptoir ne la propose pas.
    where: { id: { in: matches.map((row) => row.id) }, ...SELLABLE },
    include: {
      gifts: { select: { quantity: true, giftVariant: { select: { product: { select: { name: true } } } } } },
      product: {
        select: {
          name: true,
          images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
          deviceModel: { select: { colorPhotos: { select: { color: true, url: true } } } },
        },
      },
    },
  });

  const hits = variants
    .map((variant) => ({
      sku: variant.sku,
      productId: variant.productId,
      productName: variant.product.name,
      options: variant.options,
      condition: variant.condition,
      price: variant.price,
      stock: variant.stock,
      conditionReport: buildConditionReport(variant),
      image: variantImage(variant.options, variant.product.deviceModel?.colorPhotos ?? [], variant.product.images[0]?.url ?? null),
      grade: variant.grade,
      batteryHealth: variant.batteryHealth,
      replacedParts: variant.replacedParts,
      compatibleParts: variant.compatibleParts,
      defects: variant.defects,
      limitations: variant.limitations,
      withBox: variant.withBox,
      details: variant.details,
      warrantyMonths: variant.warrantyMonths,
      origin: variant.origin,
      reference: variant.reference,
      purchasePrice: variant.purchasePrice,
      gifts: variant.gifts.map((gift) => ({ name: gift.giftVariant.product.name, quantity: gift.quantity })),
    }))
    .sort((a, b) =>
      words.length === 0
        ? a.productName.localeCompare(b.productName) || a.price - b.price
        : rank(a, needle, words) - rank(b, needle, words) ||
          a.productName.length - b.productName.length ||
          a.productName.localeCompare(b.productName) ||
          a.price - b.price,
    );
  return { hits: hits.slice(0, limit), total: hits.length };
}
