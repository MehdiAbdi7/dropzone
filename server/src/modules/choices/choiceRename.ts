import type { ChoiceGroup, Prisma } from "../../generated/prisma/client.js";

type Tx = Prisma.TransactionClient;

// Les produits recopient le NOM d'une valeur (« Couleur: "Burgundy" »), pas son id. Renommer une
// valeur dans Listes doit donc renommer toutes ses copies, dans la même transaction, sinon les
// produits gardent un nom qui n'existe plus (pastille sans teinte, filtre qui ne trouve plus rien).
// Les commandes ne sont pas touchées : une commande est un fait passé.

// La clé de `options` de chaque liste fixe. Même table que OPTION_FIELDS du front
// (client/src/config/catalog.ts) : une liste ajoutée là doit l'être ici.
const OPTION_KEY: Partial<Record<ChoiceGroup, string>> = {
  storage: "Stockage",
  color: "Couleur",
  ram: "RAM",
  processor: "Processeur",
  keyboard: "Clavier",
  size: "Taille",
  connectivity: "Connectivité",
  sim: "SIM",
  gpu: "Carte graphique",
};

// Une option vaut un texte (« 256 Go ») ou une liste de textes (choix multiples, cartes graphiques).
async function renameInOptions(tx: Tx, key: string, prev: string, next: string) {
  await tx.$executeRaw`
    UPDATE product_variants
    SET options = jsonb_set(options, ARRAY[${key}::text], to_jsonb(${next}::text))
    WHERE jsonb_typeof(options -> ${key}::text) = 'string' AND options ->> ${key}::text = ${prev}`;
  await tx.$executeRaw`
    UPDATE product_variants
    SET options = jsonb_set(
      options,
      ARRAY[${key}::text],
      (SELECT jsonb_agg(CASE WHEN value = ${prev} THEN ${next}::text ELSE value END ORDER BY position)
         FROM jsonb_array_elements_text(options -> ${key}::text) WITH ORDINALITY AS item(value, position))
    )
    WHERE jsonb_typeof(options -> ${key}::text) = 'array'
      AND options -> ${key}::text @> to_jsonb(ARRAY[${prev}::text])`;
}

export async function renameChoiceEverywhere(
  tx: Tx,
  choice: { group: ChoiceGroup | null; listName: string | null },
  prev: string,
  next: string,
) {
  // Une liste personnalisée : son nom est la clé de `options`.
  const key = choice.group ? OPTION_KEY[choice.group] : choice.listName;
  if (key) {
    await renameInOptions(tx, key, prev, next);
  }

  switch (choice.group) {
    case "color":
      await tx.$executeRaw`UPDATE device_models SET colors = array_replace(colors, ${prev}, ${next}) WHERE ${prev} = ANY(colors)`;
      await tx.$executeRaw`UPDATE device_models SET poster_color = ${next} WHERE poster_color = ${prev}`;
      await tx.$executeRaw`UPDATE model_color_photos SET color = ${next} WHERE color = ${prev}`;
      break;
    case "replaced_part":
      await tx.$executeRaw`
        UPDATE product_variants
        SET replaced_parts = array_replace(replaced_parts, ${prev}, ${next}),
            compatible_parts = array_replace(compatible_parts, ${prev}, ${next})
        WHERE ${prev} = ANY(replaced_parts) OR ${prev} = ANY(compatible_parts)`;
      break;
    case "defect":
      await tx.$executeRaw`UPDATE product_variants SET defects = array_replace(defects, ${prev}, ${next}) WHERE ${prev} = ANY(defects)`;
      break;
    case "limitation":
      await tx.$executeRaw`UPDATE product_variants SET limitations = array_replace(limitations, ${prev}, ${next}) WHERE ${prev} = ANY(limitations)`;
      break;
    case "origin":
      await tx.$executeRaw`UPDATE product_variants SET origin = ${next} WHERE origin = ${prev}`;
      break;
    default:
      break;
  }
}
