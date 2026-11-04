import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { modelSlug } from "../src/modules/models/modelSlug.js";
import { DEVICE_MODELS } from "../src/scripts/device-models.js";
import { type Listing, parseListing, readTsv } from "../src/scripts/import/listing.js";
import { IGNORED, MAKERS, MODEL_MAP } from "../src/scripts/import/models-map.js";
import { OFFICIAL_SPECS, SPECS_MISSING } from "../src/scripts/import/official-specs.js";

// Les données vérifiées à la main, confrontées au vrai relevé (server/data).
const rows = readTsv(readFileSync(new URL("../data/dropzone-annonces.tsv", import.meta.url), "utf8"));
const listings = rows.map(parseListing).filter((result): result is Listing => !("skip" in result));
const mapped = listings.filter((listing) => listing.modelKey in MODEL_MAP);

describe("La correspondance entre le relevé et les modèles", () => {
  it("donne un modèle, ou une raison d'être ignorée, à chaque annonce", () => {
    const missing = [...new Set(listings.map((listing) => listing.modelKey))].filter(
      (key) => !(key in MODEL_MAP) && !(key in IGNORED),
    );
    expect(missing).toEqual([]);
  });

  it("n'utilise que des fabricants connus, et des années plausibles", () => {
    for (const entry of Object.values(MODEL_MAP)) {
      expect(MAKERS).toContain(entry.maker);
      if (entry.year !== null) {
        expect(entry.year).toBeGreaterThanOrEqual(2016);
        expect(entry.year).toBeLessThanOrEqual(2026);
      }
    }
  });

  it("garde le nom exact et l'année d'un modèle déjà dans la liste des modèles", () => {
    for (const entry of Object.values(MODEL_MAP)) {
      const known = DEVICE_MODELS.find((model) => modelSlug(model.brand, model.name) === modelSlug(entry.maker, entry.name));
      if (known) {
        expect({ maker: entry.maker, name: entry.name, year: entry.year }).toEqual({
          maker: known.brand,
          name: known.name,
          year: known.releaseYear,
        });
      }
    }
  });

  it("ne range jamais deux sortes d'appareils dans le même modèle", () => {
    const kinds = new Map<string, Set<string>>();
    for (const listing of mapped) {
      const { maker, name } = MODEL_MAP[listing.modelKey];
      const key = `${maker}|${name}`;
      kinds.set(key, (kinds.get(key) ?? new Set()).add(listing.kind));
    }
    expect([...kinds].filter(([, set]) => set.size > 1)).toEqual([]);
  });
});

describe("Les caractéristiques officielles des téléphones et tablettes", () => {
  const devices = [
    ...new Set(
      mapped
        .filter((listing) => listing.kind !== "laptop")
        .map((listing) => `${MODEL_MAP[listing.modelKey].maker}|${MODEL_MAP[listing.modelKey].name}`),
    ),
  ];

  it("en donne exactement 4 à chaque modèle, ou dit pourquoi il n'en a pas", () => {
    for (const device of devices) {
      if (device in SPECS_MISSING) {
        continue;
      }
      expect(Object.keys(OFFICIAL_SPECS[device] ?? {}).sort(), device).toEqual(["Appareil photo", "Batterie", "Puce", "Écran"].sort());
    }
  });

  it("n'en a pas pour un modèle absent du relevé", () => {
    expect(Object.keys(OFFICIAL_SPECS).filter((device) => !devices.includes(device))).toEqual([]);
  });
});
