// La lecture du relevé des annonces Instagram de DropZone (server/data/dropzone-annonces.tsv,
// 212 publications du 03/05 au 03/11/2026). Des fonctions pures : elles transforment une
// ligne de texte en une annonce rangée, sans toucher à la base. Ce qu'elles ne savent pas
// lire fait échouer l'import (rien n'est perdu en silence, rien n'est inventé).
import { createHash } from "node:crypto";
import { REFERENCE_PATTERN } from "../../modules/products/product.schema.js";

const COLUMNS = [
  "date", "code", "type", "modele", "cpu", "ram", "stockage", "ecran", "gpu", "prix_da",
  "reference", "garantie", "etat", "batterie", "origine", "sim", "neuf",
] as const;

export type RawRow = Record<(typeof COLUMNS)[number], string>;

export type Listing = {
  code: string;
  date: string;
  kind: "phone" | "tablet" | "laptop";
  // Le nom du relevé, sans la couleur ; la clé de MODEL_MAP (models-map.ts).
  modelKey: string;
  condition: "new" | "refurbished";
  price: number;
  // Stockage, RAM, Couleur, SIM, Connectivité, Processeur, Carte graphique.
  options: Record<string, string>;
  grade: number | null;
  batteryHealth: number | null;
  details: string | null;
  origin: string | null;
  warrantyMonths: number | null;
  reference: string | null;
  // Pour les caractéristiques du produit : l'écran (PC et tablettes), la puce (tablettes).
  screen: string | null;
  chip: string | null;
};

// Le relevé omet les colonnes vides de fin de ligne : on les complète.
export function readTsv(text: string): RawRow[] {
  const [header, ...lines] = text
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => line.trim() !== "");
  const names = header.split("\t");
  return lines.map((line) => {
    const cells = line.split("\t");
    const entries = COLUMNS.map((column) => {
      const index = names.indexOf(column);
      return [column, index >= 0 ? (cells[index] ?? "").trim() : ""];
    });
    return Object.fromEntries(entries) as RawRow;
  });
}

const KINDS: Record<string, Listing["kind"]> = { tel: "phone", tab: "tablet", pc: "laptop" };

// Les drapeaux des annonces.
const ORIGINS: Record<string, string> = {
  EU: "Europe",
  CA: "Canada",
  JP: "Japon",
  US: "États-Unis",
  USA: "États-Unis",
  DZ: "Algérie",
};

// Les couleurs écrites dans un nom de modèle, entre parenthèses (« iPhone 13 (rose) »)
// ou à la fin pour un MacBook (« … (2022) Minuit »), avec leur nom dans la liste « Couleurs ».
const COLOR_WORDS: Record<string, string> = {
  rose: "Rose",
  orange: "Orange",
  bleu: "Bleu",
  noir: "Noir",
  blanc: "Blanc",
  vert: "Vert",
  violet: "Violet",
  jaune: "Jaune",
  rouge: "Rouge",
  argent: "Argent",
  minuit: "Minuit",
};
const TRAILING_COLORS = ["Gris sidéral", "Lumière stellaire", "Or rose", "Minuit", "Argent"];

// « 256 ou 512 Go » → « 256 Go » ; « M3 Pro 11 ou 12 cœurs » → « M3 Pro 11 cœurs » :
// une annonce qui donne une fourchette devient un exemplaire avec la première valeur.
const firstOfRange = (text: string) => text.replace(/(\d+(?:,\d+)?)\s+ou\s+\d+(?:,\d+)?/g, "$1");

function storageOf(text: string): string | null {
  const value = firstOfRange(text);
  if (!value) {
    return null;
  }
  // Deux disques : chacun garde son type (SSD, HDD) ; NVMe et SATA sont retirés.
  const disks = value.split("+").map((part) => {
    const match = /(\d+)\s*(Go|To)\s*(SSD|HDD)?/.exec(part);
    if (!match) {
      throw new Error(`Stockage illisible : « ${text} »`);
    }
    return match[3] && value.includes("+") ? `${match[1]} ${match[2]} ${match[3]}` : `${match[1]} ${match[2]}`;
  });
  return disks.join(" + ");
}

function ramOf(text: string): string | null {
  if (!text) {
    return null;
  }
  const match = /^(\d+)\s*Go/.exec(text);
  if (!match) {
    throw new Error(`RAM illisible : « ${text} »`);
  }
  return `${match[1]} Go`;
}

// Le processeur avec son fabricant, comme dans la liste « Processeurs » du back-office.
function processorOf(text: string): string | null {
  const cpu = firstOfRange(text);
  if (!cpu) {
    return null;
  }
  if (/^i[3579]-/.test(cpu) || /^Ultra \d/.test(cpu)) {
    return `Intel Core ${cpu}`;
  }
  if (/^(Core|Celeron|Pentium|Xeon)\b/.test(cpu)) {
    return `Intel ${cpu}`;
  }
  if (/^Ryzen\b/.test(cpu)) {
    return `AMD ${cpu}`;
  }
  if (/^M\d/.test(cpu)) {
    return `Apple ${cpu}`;
  }
  if (/^Snapdragon\b/.test(cpu)) {
    return `Qualcomm ${cpu}`;
  }
  return cpu;
}

// Le nom du modèle sans sa couleur, et la couleur (la première citée).
function splitColor(name: string): { modelKey: string; color: string | null } {
  const parenthesis = /\s*\(([^)]*)\)\s*$/.exec(name);
  if (parenthesis) {
    const words = parenthesis[1].split(/\s*,\s*/).map((word) => word.toLowerCase());
    if (words.every((word) => COLOR_WORDS[word])) {
      return { modelKey: name.slice(0, parenthesis.index), color: COLOR_WORDS[words[0]] };
    }
  }
  const trailing = TRAILING_COLORS.find((color) => name.endsWith(` ${color}`));
  if (trailing) {
    return { modelKey: name.slice(0, -trailing.length - 1), color: trailing };
  }
  return { modelKey: name, color: null };
}

export function parseListing(row: RawRow): Listing | { skip: string } {
  if (!row.prix_da) {
    return { skip: "sans prix" };
  }
  if (row.modele.startsWith("(modèle non nommé")) {
    return { skip: "modèle non nommé" };
  }
  if (row.date < "2026-05-01") {
    return { skip: "avant mai 2026" };
  }
  const kind = KINDS[row.type];
  if (!kind) {
    throw new Error(`Type inconnu « ${row.type} » (${row.code})`);
  }

  // Les colonnes etat à neuf sont décalées sur certaines lignes : on les lit comme un
  // ensemble d'indices, où qu'ils soient.
  let isNew = false;
  let grade: number | null = null;
  let batteryHealth: number | null = null;
  let origin: string | null = null;
  let sim: string | null = null;
  const details: string[] = [];
  for (const token of [row.etat, row.batterie, row.origine, row.sim, row.neuf].filter(Boolean)) {
    let match: RegExpExecArray | null;
    if (/^(neuf|coffret)$/i.test(token)) {
      isNew = true;
    } else if (/^quasi-neuf$/i.test(token)) {
      details.push("Quasi neuf");
    } else if (/^comme-neuf$/i.test(token)) {
      details.push("Comme neuf");
    } else if ((match = /^(\d+)\/10$/.exec(token))) {
      grade = Number(match[1]);
    } else if ((match = /^(\d+(?:,\d+)?)\s*%(?:\s*\((\d+)\s*cycles\))?$/.exec(token))) {
      batteryHealth = Math.floor(Number(match[1].replace(",", ".")));
      if (match[2]) {
        details.push(`${match[2]} cycles`);
      }
    } else if ((match = /^\((\d+)\s*cycles\)$/.exec(token))) {
      // Des cycles sans pourcentage (MacBook) : on les garde, sans inventer de batterie.
      details.push(`${match[1]} cycles`);
    } else if (/^\d+(?:,\d+)?\s*à\s*\d+(?:,\d+)?\s*%$/.test(token)) {
      // Une fourchette de batteries (plusieurs exemplaires) : pas de batterie annoncée.
    } else if ((match = /^(EU|CA|JP|USA|US|DZ)(?:\+.*)?$/.exec(token))) {
      origin = ORIGINS[match[1]];
    } else if (/^2SIM$/i.test(token)) {
      sim = "Double SIM";
    } else if (/^1SIM/i.test(token)) {
      sim = "Une SIM";
    } else {
      throw new Error(`Indice illisible « ${token} » (${row.code})`);
    }
  }

  let name = row.modele;
  const options: Record<string, string> = {};
  if (kind === "tablet" && / 4G$/.test(name)) {
    name = name.slice(0, -3);
    options.Connectivité = "Wi-Fi + Cellular";
  }
  const { modelKey, color } = splitColor(name);
  const storage = storageOf(row.stockage);
  const ram = ramOf(row.ram);
  if (storage) {
    options.Stockage = storage;
  }
  if (ram) {
    options.RAM = ram;
  }
  if (color) {
    options.Couleur = color;
  }
  if (sim) {
    options.SIM = sim;
  }
  if (kind === "laptop") {
    const processor = processorOf(row.cpu);
    if (processor) {
      options.Processeur = processor;
    }
    if (row.gpu) {
      options["Carte graphique"] = row.gpu;
    }
  }

  // Un prix en dinars, des chiffres et des espaces (« 58 000 ») : le reste fait échouer
  // l'import avec l'annonce citée, au lieu d'une erreur de la base sur un NaN.
  const price = Number(row.prix_da.replace(/\s/g, ""));
  if (!Number.isInteger(price) || price <= 0) {
    throw new Error(`Prix illisible « ${row.prix_da} » (${row.code})`);
  }
  // La règle du back-office (REFERENCE_PATTERN), en majuscules comme lui : sinon la fiche
  // importée ne pourrait plus être enregistrée par le gérant.
  const reference = row.reference.trim().toUpperCase() || null;
  if (reference !== null && !REFERENCE_PATTERN.test(reference)) {
    throw new Error(`Référence « ${row.reference} » refusée par le back-office : lettres, chiffres et tirets, 20 au plus (${row.code})`);
  }

  const warranty = /^(\d+)\s*mois$/.exec(row.garantie);
  const condition = isNew ? "new" : "refurbished";
  return {
    code: row.code,
    date: row.date,
    kind,
    modelKey,
    condition,
    price,
    options,
    // Un neuf scellé n'a pas de fiche d'état.
    grade: isNew ? null : grade,
    batteryHealth: isNew ? null : batteryHealth,
    details: isNew || details.length === 0 ? null : details.join(", "),
    origin,
    warrantyMonths: warranty ? Number(warranty[1]) : null,
    reference,
    screen: kind !== "phone" && row.ecran ? row.ecran : null,
    chip: kind === "tablet" && row.cpu ? row.cpu : null,
  };
}

const DAY = 24 * 60 * 60 * 1000;

// Deux annonces identiques (même modèle, mêmes options, même prix, sans référence) à
// 31 jours ou moins d'écart : le même appareil republié. On garde la plus récente.
// Une note, une batterie, une origine ou des détails que les deux annonces donnent et qui
// diffèrent : deux appareils. Une information qu'une seule donne ne contredit rien.
export function dedupe(listings: Listing[]): Listing[] {
  const agree = <T>(x: T | null, y: T | null) => x === null || y === null || x === y;
  const sameDevice = (a: Listing, b: Listing) =>
    a.reference === null &&
    b.reference === null &&
    a.modelKey === b.modelKey &&
    a.condition === b.condition &&
    a.price === b.price &&
    agree(a.grade, b.grade) &&
    agree(a.batteryHealth, b.batteryHealth) &&
    agree(a.origin, b.origin) &&
    agree(a.details, b.details) &&
    JSON.stringify(Object.entries(a.options).sort()) === JSON.stringify(Object.entries(b.options).sort()) &&
    Math.abs(Date.parse(a.date) - Date.parse(b.date)) <= 31 * DAY;
  const newestFirst = [...listings].sort((a, b) => b.date.localeCompare(a.date));
  const kept: Listing[] = [];
  for (const listing of newestFirst) {
    if (!kept.some((other) => sameDevice(other, listing))) {
      kept.push(listing);
    }
  }
  // L'ordre du relevé (le plus récent en haut) est gardé.
  return listings.filter((listing) => kept.includes(listing));
}

// Le SKU d'une annonce importée : stable d'un import à l'autre, même si le relevé change
// d'ordre. Le code Instagram distingue majuscules et minuscules : on le hache.
export function importSku(code: string): string {
  return `IG-${createHash("sha1").update(code).digest("hex").slice(0, 10).toUpperCase()}`;
}
