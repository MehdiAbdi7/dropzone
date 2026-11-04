import { describe, expect, it } from "vitest";
import { dedupe, importSku, type Listing, parseListing, type RawRow, readTsv } from "../src/scripts/import/listing.js";

// Une ligne du relevé, recopiée de server/data/dropzone-annonces.tsv (colonnes vides
// à "" ; le relevé omet souvent les dernières).
const row = (fields: Partial<RawRow>): RawRow => ({
  date: "2026-10-01",
  code: "TEST",
  type: "tel",
  modele: "",
  cpu: "",
  ram: "",
  stockage: "",
  ecran: "",
  gpu: "",
  prix_da: "",
  reference: "",
  garantie: "",
  etat: "",
  batterie: "",
  origine: "",
  sim: "",
  neuf: "",
  ...fields,
});

const parsed = (fields: Partial<RawRow>) => {
  const result = parseListing(row(fields));
  if ("skip" in result) {
    throw new Error(`ignorée : ${result.skip}`);
  }
  return result;
};

describe("readTsv", () => {
  it("lit l'en-tête et complète les colonnes vides de fin de ligne", () => {
    const rows = readTsv(
      "date\tcode\ttype\tmodele\tcpu\tram\tstockage\tecran\tgpu\tprix_da\treference\tgarantie\tetat\tbatterie\torigine\tsim\tneuf\r\n" +
        "2026-10-31\tDfKSCSOtJDu\ttel\tiPhone 13\t\t\t128 Go\t\t\t58000\t\t6 mois\t9/10\t\tEU\r\n",
    );
    expect(rows).toEqual([row({ date: "2026-10-31", code: "DfKSCSOtJDu", modele: "iPhone 13", stockage: "128 Go", prix_da: "58000", garantie: "6 mois", etat: "9/10", origine: "EU" })]);
  });
});

describe("parseListing : une annonce du relevé", () => {
  it("lit un PC neuf (« neuf » dans une colonne décalée), sa référence et sa garantie", () => {
    // Ligne DfRYGVSDQIp : « neuf » est dans la colonne sim, pas dans neuf.
    expect(
      parsed({
        date: "2026-11-03",
        code: "DfRYGVSDQIp",
        type: "pc",
        modele: "Lenovo ThinkPad L13 2-in-1 Gen 3",
        cpu: "Core 5 120U",
        ram: "16 Go DDR5",
        stockage: "512 Go SSD NVMe",
        ecran: "13,3 WUXGA tactile",
        gpu: "Intel Graphics",
        prix_da: "165000",
        reference: "61119",
        garantie: "3 mois",
        sim: "neuf",
      }),
    ).toEqual({
      code: "DfRYGVSDQIp",
      date: "2026-11-03",
      kind: "laptop",
      modelKey: "Lenovo ThinkPad L13 2-in-1 Gen 3",
      condition: "new",
      price: 165000,
      options: {
        Processeur: "Intel Core 5 120U",
        RAM: "16 Go",
        Stockage: "512 Go",
        "Carte graphique": "Intel Graphics",
      },
      grade: null,
      batteryHealth: null,
      details: null,
      origin: null,
      warrantyMonths: 3,
      reference: "61119",
      screen: "13,3 WUXGA tactile",
      chip: null,
    } satisfies Listing);
  });

  it("prend la première option d'une fourchette, et pas de batterie pour « 92 à 100 % »", () => {
    const listing = parsed({
      modele: "iPhone 16 Pro Max",
      stockage: "256 ou 512 Go",
      prix_da: "229000",
      garantie: "6 mois",
      etat: "comme-neuf",
      batterie: "92 à 100 %",
      origine: "EU",
      sim: "1SIM",
    });
    expect(listing).toMatchObject({
      kind: "phone",
      condition: "refurbished",
      options: { Stockage: "256 Go", SIM: "Une SIM" },
      batteryHealth: null,
      details: "Comme neuf",
      origin: "Europe",
      warrantyMonths: 6,
    });
  });

  it("met les cycles de la batterie dans les détails, et arrondit vers le bas", () => {
    expect(
      parsed({ type: "tab", modele: "iPad Air 11 M2 (2024)", cpu: "M2", stockage: "128 Go", ecran: "11 Liquid Retina", prix_da: "108000", batterie: "91 % (196 cycles)" }),
    ).toMatchObject({ kind: "tablet", batteryHealth: 91, details: "196 cycles", chip: "M2", screen: "11 Liquid Retina", options: { Stockage: "128 Go" } });
    expect(parsed({ type: "pc", modele: "Apple MacBook Pro 13 (2017) Gris sidéral", ram: "8 Go", stockage: "128 Go SSD", prix_da: "55000", batterie: "95,1 % (721 cycles)" })).toMatchObject({
      batteryHealth: 95,
      details: "721 cycles",
      modelKey: "Apple MacBook Pro 13 (2017)",
      options: { RAM: "8 Go", Stockage: "128 Go", Couleur: "Gris sidéral" },
    });
  });

  it("garde les cycles annoncés sans pourcentage, sans inventer de batterie", () => {
    // Ligne DalTLUjjeHd : « (139 cycles) » seul dans la colonne batterie.
    expect(parsed({ type: "pc", modele: "Apple MacBook Pro 15 (2018) Gris sidéral", prix_da: "99000", batterie: "(139 cycles)" })).toMatchObject({
      batteryHealth: null,
      details: "139 cycles",
    });
  });

  it("garde la première origine de « EU+JP+CA »", () => {
    expect(parsed({ modele: "iPhone 15", stockage: "128 Go", prix_da: "115000", etat: "comme-neuf", batterie: "77 à 92 %", origine: "EU+JP+CA" }).origin).toBe("Europe");
  });

  it("lit la double SIM", () => {
    expect(parsed({ modele: "Galaxy A55", stockage: "128 ou 256 Go", prix_da: "50000", etat: "comme-neuf", origine: "EU", sim: "2SIM" }).options).toEqual({
      Stockage: "128 Go",
      SIM: "Double SIM",
    });
  });

  it("fait d'un « quasi-neuf » une affaire, avec ces mots dans les détails", () => {
    expect(
      parsed({ type: "pc", modele: "Dell Precision 5690", cpu: "Core Ultra 5 135H", ram: "16 Go LPDDR5X 7467", stockage: "512 Go SSD NVMe", ecran: "16", gpu: "Arc", prix_da: "168000", garantie: "3 mois", sim: "quasi-neuf" }),
    ).toMatchObject({ condition: "refurbished", details: "Quasi neuf", options: { Processeur: "Intel Core Ultra 5 135H", RAM: "16 Go", "Carte graphique": "Arc" } });
  });

  it("lit une couleur entre parenthèses, mais garde une parenthèse qui n'en est pas une", () => {
    expect(parsed({ modele: "iPhone 13 (rose)", prix_da: "78000" })).toMatchObject({ modelKey: "iPhone 13", options: { Couleur: "Rose" } });
    expect(parsed({ modele: "iPhone 17 Pro Max (orange, bleu)", prix_da: "352000", etat: "coffret" })).toMatchObject({
      modelKey: "iPhone 17 Pro Max",
      condition: "new",
      options: { Couleur: "Orange" },
    });
    expect(parsed({ type: "pc", modele: "ASUS TUF Gaming F17 (i7-12700H)", prix_da: "208000" }).modelKey).toBe("ASUS TUF Gaming F17 (i7-12700H)");
  });

  it("fait d'une tablette « 4G » une tablette Wi-Fi + Cellular", () => {
    expect(parsed({ type: "tab", modele: "iPad Pro 12,9 (2020, 4e gén.) 4G", cpu: "A12Z", stockage: "256 Go", prix_da: "98000", batterie: "91 %" })).toMatchObject({
      modelKey: "iPad Pro 12,9 (2020, 4e gén.)",
      options: { Stockage: "256 Go", Connectivité: "Wi-Fi + Cellular" },
      batteryHealth: 91,
    });
  });

  it("range deux disques et une puce Apple", () => {
    expect(parsed({ type: "pc", modele: "HP OMEN 16-wf1039nf", stockage: "256 Go SSD NVMe + 1 To SATA", prix_da: "288000" }).options.Stockage).toBe("256 Go SSD + 1 To");
    expect(parsed({ type: "pc", modele: "MSI GF63 Thin 11SC", stockage: "512 Go SSD NVMe + 1 To HDD", prix_da: "99000" }).options.Stockage).toBe("512 Go SSD + 1 To HDD");
    expect(parsed({ type: "pc", modele: "Apple MacBook Pro 14 M3 Pro (2024) Argent", cpu: "M3 Pro 11 ou 12 cœurs", prix_da: "270000" }).options.Processeur).toBe("Apple M3 Pro 11 cœurs");
    expect(parsed({ type: "pc", modele: "ASUS Vivobook OLED (Ryzen 7 5800HS)", cpu: "Ryzen 7 5800HS", prix_da: "138000" }).options.Processeur).toBe("AMD Ryzen 7 5800HS");
  });

  it("ignore une annonce sans prix, un modèle non nommé et une annonce d'avant mai", () => {
    expect(parseListing(row({ modele: "iPhone 11", etat: "comme-neuf" }))).toEqual({ skip: "sans prix" });
    expect(parseListing(row({ modele: "(modèle non nommé, iPhone)", prix_da: "166000" }))).toEqual({ skip: "modèle non nommé" });
    expect(parseListing(row({ date: "2026-04-30", modele: "iPhone 13", prix_da: "58000" }))).toEqual({ skip: "avant mai 2026" });
  });

  it("refuse un indice qu'elle ne sait pas lire, plutôt que de le perdre", () => {
    expect(() => parseListing(row({ modele: "iPhone 13", prix_da: "58000", etat: "mystère" }))).toThrow("mystère");
  });

  // Sinon la fiche importée ne pourrait plus être enregistrée dans le back-office.
  it("refuse une référence que le back-office refuserait, et l'écrit en majuscules comme lui", () => {
    expect(() => parseListing(row({ modele: "iPhone 13", prix_da: "58000", reference: "51057 bis" }))).toThrow("51057 bis");
    expect(parsed({ modele: "iPhone 13", prix_da: "58000", reference: "ab-12" }).reference).toBe("AB-12");
  });

  it("refuse un prix illisible avec un message qui le cite", () => {
    expect(() => parseListing(row({ modele: "iPhone 13", prix_da: "58 000 DA" }))).toThrow("Prix illisible « 58 000 DA » (TEST)");
  });
});

describe("dedupe : une annonce republiée", () => {
  const listing = (code: string, date: string, extra: Partial<Listing> = {}) =>
    ({ ...parsed({ code, date, modele: "iPhone 16", stockage: "128 Go", prix_da: "148000" }), ...extra }) as Listing;

  it("garde la plus récente de deux annonces identiques à 10 jours d'écart", () => {
    expect(dedupe([listing("A", "2026-07-01"), listing("B", "2026-07-11")]).map((l) => l.code)).toEqual(["B"]);
  });

  it("garde les deux à 40 jours d'écart, ou quand le prix ou la référence diffère", () => {
    expect(dedupe([listing("A", "2026-07-01"), listing("B", "2026-08-10")])).toHaveLength(2);
    expect(dedupe([listing("A", "2026-07-01"), listing("B", "2026-07-05", { price: 150000 })])).toHaveLength(2);
    expect(dedupe([listing("A", "2026-07-01", { reference: "1" }), listing("B", "2026-07-05", { reference: "1" })])).toHaveLength(2);
  });

  const described = { grade: 9, batteryHealth: 90, origin: "Europe", details: "Comme neuf" };

  it("garde les deux quand la note, la batterie, l'origine ou les détails diffèrent : deux appareils", () => {
    for (const extra of [{ grade: 8 }, { batteryHealth: 85 }, { origin: "Japon" }, { details: "Quasi neuf" }]) {
      const pair = [listing("A", "2026-07-01", described), listing("B", "2026-07-05", { ...described, ...extra })];
      expect(dedupe(pair)).toHaveLength(2);
    }
  });

  // Les deux annonces de l'iPad 10e génération du relevé (21/05 et 10/06) : l'une donne
  // les cycles, l'autre la note. Une information absente ne contredit rien.
  it("ne distingue pas deux annonces dont l'une ne dit pas ce que l'autre dit", () => {
    const pair = [
      listing("A", "2026-07-01", { batteryHealth: 100, details: "44 cycles" }),
      listing("B", "2026-07-05", { grade: 10, batteryHealth: 100 }),
    ];
    expect(dedupe(pair).map((l) => l.code)).toEqual(["B"]);
  });
});

describe("importSku", () => {
  it("donne un SKU stable et valide pour chaque publication", () => {
    expect(importSku("DfRYGVSDQIp")).toBe(importSku("DfRYGVSDQIp"));
    expect(importSku("DfRYGVSDQIp")).not.toBe(importSku("DfRYGVSDQIP"));
    expect(importSku("DZ17-blDXQi")).toMatch(/^IG-[0-9A-F]{10}$/);
  });
});
