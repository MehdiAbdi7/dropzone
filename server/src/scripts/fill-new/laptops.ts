// Les 156 PC portables des séries : prix du neuf (médiane Ouedkniss, filtre « Neuf », 12/11/2026,
// pour la configuration courante du modèle), configuration vendue et fiche. Les modèles dont
// le neuf n'existe plus sur le marché (anciens ROG, MacBook Intel, Latitude 7400…) ont un stock
// de 0 : fiche complète, « Épuisé » en boutique. Les prix « estimés » viennent des modèles voisins
// (aucune annonce exacte) ; ils sont listés dans le rapport context/import/analyse-prix-neuf-dropzone.md.
import type { DeviceRow } from "./types.js";

const SYSTEMS = { p: "Windows 11 Pro", h: "Windows 11 Home", m: "macOS", c: "ChromeOS" } as const;

// cfg = « Processeur|RAM en Go|Stockage|Carte graphique (facultative) ».
export function laptop(
  name: string,
  price: number,
  stock: 0 | 3,
  screen: string,
  cfg: string,
  os: keyof typeof SYSTEMS,
  use: string,
  blurb: string,
  color = "Noir",
): DeviceRow {
  const [cpu, ram, ssd, gpu] = cfg.split("|");
  const options: Record<string, string> = {
    Processeur: cpu,
    RAM: `${ram} Go`,
    Stockage: ssd === "1000" ? "1 To" : `${ssd} Go`,
  };
  if (gpu) {
    options["Carte graphique"] = gpu;
  }
  return {
    name,
    price,
    stock,
    options,
    blurb,
    // Pas de Processeur ni de Carte graphique ici : ils changent d'une variante à l'autre
    // (affaires de configurations différentes), la variante les dit. Voir fillNew.ts.
    specs: { Écran: screen, Système: SYSTEMS[os], Usage: use },
    color,
  };
}

export const PRO = "Bureautique professionnelle";
export const CREATION = "Création et usage professionnel";
export const WORKSTATION = "Station de travail";
export const GAMING = "Gaming";
export const ULTRA = "Ultraportable";
export const HOME = "Bureautique et usage familial";
export const TWO_IN_ONE = "2-en-1 tactile";

export const APPLE_AND_DELL: DeviceRow[] = [
  // ---------- MacBook ----------
  laptop("MacBook Air 13 pouces M1", 170_000, 3, "13,3 pouces Retina", "Apple M1|8|256", "m", ULTRA,
    "Le MacBook Air à puce M1 : fin, sans ventilateur, avec une longue autonomie.", "Argent"),
  laptop("MacBook Air 13 pouces M2", 210_000, 3, "13,6 pouces Liquid Retina", "Apple M2|8|256", "m", ULTRA,
    "Le MacBook Air redessiné, plus fin, avec la puce M2 et la recharge MagSafe.", "Minuit"),
  laptop("MacBook Air 15 pouces M2", 275_000, 3, "15,3 pouces Liquid Retina", "Apple M2|8|256", "m", ULTRA,
    "Le grand MacBook Air de 15 pouces, fin et silencieux, avec la puce M2.", "Minuit"),
  laptop("MacBook Air 13 pouces M3", 242_000, 3, "13,6 pouces Liquid Retina", "Apple M3|8|256", "m", ULTRA,
    "Le MacBook Air 13 pouces avec la puce M3, fin et silencieux.", "Minuit"),
  laptop("MacBook Air 15 pouces M3", 277_000, 3, "15,3 pouces Liquid Retina", "Apple M3|8|256", "m", ULTRA,
    "Le MacBook Air 15 pouces avec la puce M3, fin et silencieux.", "Minuit"),
  laptop("MacBook Air 13 pouces M4", 232_000, 3, "13,6 pouces Liquid Retina", "Apple M4|16|256", "m", ULTRA,
    "Le MacBook Air 13 pouces avec la puce M4 et 16 Go de mémoire dès le départ.", "Minuit"),
  laptop("MacBook Air 15 pouces M4", 290_000, 3, "15,3 pouces Liquid Retina", "Apple M4|16|256", "m", ULTRA,
    "Le MacBook Air 15 pouces avec la puce M4 et 16 Go de mémoire dès le départ.", "Minuit"),
  laptop("MacBook Air 13 pouces Intel (2020)", 90_000, 0, "13,3 pouces Retina", "Intel Core i5 (10e gén.)|8|256", "m", ULTRA,
    "Le dernier MacBook Air à processeur Intel, avec un clavier Magic Keyboard.", "Argent"),
  laptop("MacBook Air 13 pouces Intel (2018)", 80_000, 0, "13,3 pouces Retina", "Intel Core i5 (8e gén.)|8|128", "m", ULTRA,
    "Le premier MacBook Air à écran Retina, avec Touch ID.", "Argent"),
  laptop("MacBook Pro 13 pouces M1", 150_000, 0, "13,3 pouces Retina avec Touch Bar", "Apple M1|8|256", "m", CREATION,
    "Le MacBook Pro 13 pouces avec la puce M1, un ventilateur et la Touch Bar.", "Gris sidéral"),
  laptop("MacBook Pro 13 pouces M2", 190_000, 0, "13,3 pouces Retina avec Touch Bar", "Apple M2|8|256", "m", CREATION,
    "Le dernier MacBook Pro 13 pouces, avec la puce M2 et la Touch Bar.", "Gris sidéral"),
  laptop("MacBook Pro 14 pouces M1 Pro", 250_000, 0, "14,2 pouces Liquid Retina XDR", "Apple M1 Pro|16|512", "m", CREATION,
    "Le MacBook Pro 14 pouces redessiné, avec un écran XDR et les ports HDMI et SD.", "Gris sidéral"),
  laptop("MacBook Pro 14 pouces M2 Pro", 300_000, 0, "14,2 pouces Liquid Retina XDR", "Apple M2 Pro|16|512", "m", CREATION,
    "Le MacBook Pro 14 pouces avec la puce M2 Pro, pour le montage et le développement.", "Gris sidéral"),
  laptop("MacBook Pro 14 pouces M3", 320_000, 3, "14,2 pouces Liquid Retina XDR", "Apple M3|8|512", "m", CREATION,
    "Le MacBook Pro 14 pouces d'entrée de gamme, avec la puce M3.", "Gris sidéral"),
  laptop("MacBook Pro 14 pouces M3 Pro", 400_000, 3, "14,2 pouces Liquid Retina XDR", "Apple M3 Pro|18|512", "m", CREATION,
    "L'écran Liquid Retina XDR et la puissance du M3 Pro pour le montage et le développement.", "Gris sidéral"),
  laptop("MacBook Pro 14 pouces M4", 350_000, 3, "14,2 pouces Liquid Retina XDR", "Apple M4|16|512", "m", CREATION,
    "Le MacBook Pro 14 pouces avec la puce M4 et 16 Go de mémoire dès le départ.", "Argent"),
  laptop("MacBook Pro 14 pouces M4 Pro", 480_000, 3, "14,2 pouces Liquid Retina XDR", "Apple M4 Pro|24|512", "m", CREATION,
    "Le MacBook Pro 14 pouces avec la puce M4 Pro, pour les projets lourds.", "Argent"),
  laptop("MacBook Pro 16 pouces M1 Pro", 280_000, 0, "16,2 pouces Liquid Retina XDR", "Apple M1 Pro|16|512", "m", CREATION,
    "Le grand MacBook Pro avec la puce M1 Pro, un écran XDR et une longue autonomie.", "Gris sidéral"),
  laptop("MacBook Pro 16 pouces M2 Pro", 340_000, 0, "16,2 pouces Liquid Retina XDR", "Apple M2 Pro|16|512", "m", CREATION,
    "Le grand MacBook Pro avec la puce M2 Pro.", "Gris sidéral"),
  laptop("MacBook Pro 16 pouces M3 Pro", 455_000, 3, "16,2 pouces Liquid Retina XDR", "Apple M3 Pro|18|512", "m", CREATION,
    "Le grand MacBook Pro avec la puce M3 Pro et un écran XDR.", "Gris sidéral"),
  laptop("MacBook Pro 16 pouces M4 Pro", 520_000, 3, "16,2 pouces Liquid Retina XDR", "Apple M4 Pro|24|512", "m", CREATION,
    "Le grand MacBook Pro avec la puce M4 Pro, pour la vidéo et la 3D.", "Argent"),
  laptop("MacBook Pro 16 pouces M4 Max", 750_000, 3, "16,2 pouces Liquid Retina XDR", "Apple M4 Max|36|1000", "m", CREATION,
    "Le MacBook Pro le plus puissant, avec la puce M4 Max, pour la 3D et la vidéo 8K.", "Argent"),
  laptop("MacBook Pro 13 pouces Intel (2020)", 110_000, 0, "13,3 pouces Retina avec Touch Bar", "Intel Core i5 (10e gén.)|16|512", "m", CREATION,
    "Le MacBook Pro 13 pouces de 2020 à processeur Intel, avec le clavier Magic Keyboard.", "Gris sidéral"),
  laptop("MacBook Pro 13 pouces Intel (2017)", 70_000, 0, "13,3 pouces Retina", "Intel Core i5 (7e gén.)|8|256", "m", CREATION,
    "Le MacBook Pro 13 pouces de 2017, avec Thunderbolt 3.", "Gris sidéral"),
  laptop("MacBook Pro 15 pouces Intel (2018)", 110_000, 0, "15,4 pouces Retina avec Touch Bar", "Intel Core i7 (8e gén.)|16|256", "m", CREATION,
    "Le MacBook Pro 15 pouces de 2018, avec la Touch Bar et une carte graphique dédiée.", "Gris sidéral"),

  // ---------- Dell ----------
  laptop("Latitude 5420", 120_000, 3, "14 pouces Full HD", "Intel Core i5-1135G7|8|256", "p", PRO,
    "L'ordinateur d'entreprise de Dell, robuste et facile à entretenir.", "Gris"),
  laptop("Latitude 5430", 110_000, 3, "14 pouces Full HD", "Intel Core i7-1265U|16|512", "p", PRO,
    "L'ordinateur d'entreprise de Dell, de 12e génération Intel, avec la gestion vPro.", "Gris"),
  laptop("Latitude 5440", 128_000, 3, "14 pouces Full HD", "Intel Core i5-1345U|16|512", "p", PRO,
    "L'ordinateur d'entreprise de Dell, de 13e génération Intel, avec 16 Go de mémoire.", "Gris"),
  laptop("Latitude 5540", 160_000, 3, "15,6 pouces Full HD", "Intel Core i5-1335U|16|512", "p", PRO,
    "Le Latitude 15,6 pouces, avec 16 Go de mémoire et un clavier pavé numérique.", "Gris"),
  laptop("Latitude 3540", 135_000, 3, "15,6 pouces Full HD", "Intel Core i5-1335U|16|512", "p", PRO,
    "Le Latitude abordable de 15,6 pouces, pour la bureautique de tous les jours.", "Gris"),
  laptop("Latitude 7440", 192_000, 3, "14 pouces Full HD+", "Intel Core i5-1345U|16|256", "p", PRO,
    "Le Latitude haut de gamme de 14 pouces, avec un châssis en aluminium.", "Gris"),
  laptop("Latitude 7420", 130_000, 3, "14 pouces Full HD", "Intel Core i7-1185G7|16|512", "p", PRO,
    "Le Latitude haut de gamme de 11e génération, fin et léger.", "Gris"),
  laptop("Latitude 7430", 140_000, 3, "14 pouces Full HD", "Intel Core i7-1265U|16|512", "p", PRO,
    "Le Latitude haut de gamme de 12e génération, fin et léger.", "Gris"),
  laptop("Latitude 7400", 90_000, 0, "14 pouces Full HD", "Intel Core i7 (8e gén.)|16|512", "p", PRO,
    "Le Latitude ultraportable de 2019, fin et léger.", "Gris"),
  laptop("Latitude 7350", 200_000, 3, "13,3 pouces Full HD+", "Intel Core Ultra 7|16|512", "p", PRO,
    "Le Latitude ultraportable à processeur Intel Core Ultra, pour les déplacements.", "Gris"),
  laptop("Latitude 5350 2-in-1", 165_000, 3, "13,3 pouces tactile", "Intel Core Ultra 5|16|512", "p", TWO_IN_ONE,
    "Le Latitude 2-en-1 à processeur Intel Core Ultra, avec écran tactile pivotant.", "Gris"),
  laptop("Precision 3490", 200_000, 3, "14 pouces Full HD+", "Intel Core Ultra 7|16|512|NVIDIA RTX A500", "p", WORKSTATION,
    "La station de travail compacte de Dell, certifiée pour les logiciels de conception.", "Gris"),
  laptop("Precision 3581", 215_000, 3, "15,6 pouces Full HD", "Intel Core i7-13700H|16|512|NVIDIA RTX A1000", "p", WORKSTATION,
    "La station de travail de 15,6 pouces de Dell, avec une carte graphique professionnelle.", "Gris"),
  laptop("Precision 3571", 280_000, 3, "15,6 pouces Full HD", "Intel Core i7-12800H|16|512|NVIDIA RTX A1000", "p", WORKSTATION,
    "La station de travail de 15,6 pouces de Dell, de 12e génération.", "Gris"),
  laptop("Precision 3561", 150_000, 3, "15,6 pouces Full HD", "Intel Core i7-11850H|16|512|NVIDIA RTX A2000", "p", WORKSTATION,
    "La station de travail de 15,6 pouces de Dell, de 11e génération.", "Gris"),
  laptop("Precision 5560", 175_000, 3, "15,6 pouces", "Intel Core i7-11850H|16|512|NVIDIA RTX A2000", "p", WORKSTATION,
    "La station de travail fine de Dell, avec un écran à bords fins.", "Argent"),
  laptop("Precision 5570", 260_000, 3, "15,6 pouces", "Intel Core i7-12800H|16|512|NVIDIA RTX A1000", "p", WORKSTATION,
    "La station de travail fine de Dell, de 12e génération.", "Argent"),
  laptop("Precision 5680", 330_000, 3, "16 pouces", "Intel Core i7-13800H|32|1000|NVIDIA RTX 2000 Ada", "p", WORKSTATION,
    "La station de travail de 16 pouces de Dell, avec une carte graphique RTX Ada.", "Argent"),
  laptop("Precision 5690", 369_000, 3, "16 pouces 4K OLED", "Intel Core Ultra 9|64|1000|NVIDIA RTX 3000 Ada", "p", WORKSTATION,
    "La station de travail haut de gamme de Dell, avec un écran OLED 4K.", "Argent"),
  laptop("Precision 7560", 230_000, 3, "15,6 pouces", "Intel Core i7-11850H|32|512|NVIDIA RTX A3000", "p", WORKSTATION,
    "La station de travail de Dell, pour la 3D et la simulation.", "Gris"),
  laptop("XPS 13", 145_000, 3, "13,4 pouces", "Intel Core i7-1250U|16|512", "p", ULTRA,
    "L'ultraportable premium de Dell, avec un écran à bords quasi invisibles.", "Argent"),
  laptop("XPS 15", 178_000, 3, "15,6 pouces", "Intel Core i7-12700H|16|512|NVIDIA GeForce RTX 3050 Ti", "p", "Création et multimédia",
    "Le portable de création de Dell, avec une carte graphique dédiée.", "Argent"),
  laptop("XPS 13 9310", 120_000, 3, "13,4 pouces", "Intel Core i7-1185G7|16|512", "p", ULTRA,
    "L'ultraportable premium de Dell, de 11e génération.", "Argent"),
  laptop("XPS 15 9500", 150_000, 3, "15,6 pouces", "Intel Core i7-10750H|16|512|NVIDIA GeForce GTX 1650 Ti", "p", "Création et multimédia",
    "Le portable de création de Dell, avec un écran à bords fins.", "Argent"),
  laptop("Pro 16", 175_000, 3, "16 pouces", "Intel Core Ultra 5|16|512", "p", PRO,
    "Le Dell Pro de 16 pouces, successeur du Latitude 16 pouces.", "Gris"),
  laptop("Pro 14 Plus", 215_000, 3, "14 pouces", "Intel Core Ultra 5|16|512", "p", PRO,
    "Le Dell Pro 14 Plus, successeur du Latitude, avec des processeurs Intel Core Ultra.", "Gris"),
  laptop("Pro 13 Plus 2-in-1", 340_000, 3, "13 pouces tactile", "Intel Core Ultra 7|16|512", "p", TWO_IN_ONE,
    "Le Dell Pro 2-en-1 de 13 pouces, avec écran tactile pivotant.", "Gris"),
  laptop("Pro 13 Premium", 260_000, 3, "13 pouces", "Intel Core Ultra 7|16|512", "p", ULTRA,
    "Le Dell Pro ultraportable haut de gamme de 13 pouces.", "Gris"),
  laptop("Pro 16 Plus", 220_000, 3, "16 pouces", "Intel Core Ultra 7|16|512", "p", PRO,
    "Le Dell Pro 16 Plus, avec des processeurs Intel Core Ultra.", "Gris"),
  laptop("Pro Max 16", 380_000, 3, "16 pouces", "Intel Core Ultra 9|32|1000|NVIDIA RTX PRO", "p", WORKSTATION,
    "Le Dell Pro Max de 16 pouces, la gamme station de travail.", "Gris"),
];
