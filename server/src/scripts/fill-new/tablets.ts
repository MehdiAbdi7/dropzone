// Les 7 tablettes des séries : prix du neuf (Ouedkniss, 12/11/2026) et fiche. Puce, écran,
// appareil photo et batterie existent déjà en base ; on ajoute le système et la connectivité.
import type { DeviceRow } from "./types.js";

function tablet(
  name: string,
  price: number,
  stock: 0 | 3,
  options: Record<string, string>,
  blurb: string,
  specs: Record<string, string>,
): DeviceRow {
  return { name, price, stock, options, blurb, specs };
}

export const TABLETS: DeviceRow[] = [
  tablet("iPad (A16)", 120_000, 3, { Stockage: "128 Go", Connectivité: "Wi-Fi" },
    "L'iPad de base, récent, avec la puce A16 et 128 Go dès le départ.",
    { Système: "iPadOS", Connecteur: "USB-C" }),
  tablet("iPad (10e génération)", 95_000, 3, { Stockage: "64 Go", Connectivité: "Wi-Fi" },
    "L'iPad à écran plat de 10,9 pouces, avec la caméra frontale sur le bord long.",
    { Système: "iPadOS", Connecteur: "USB-C" }),
  tablet("iPad Air 11 pouces (M2)", 130_000, 3, { Stockage: "128 Go", Connectivité: "Wi-Fi" },
    "Un iPad fin et puissant avec la puce M2, compatible Apple Pencil Pro.",
    { Système: "iPadOS", Connecteur: "USB-C" }),
  tablet("iPad Pro 12,9 pouces (4e génération)", 150_000, 0, { Stockage: "128 Go", Connectivité: "Wi-Fi" },
    "Le grand iPad Pro de 2020, avec un scanner LiDAR et un écran ProMotion 120 Hz.",
    { Système: "iPadOS", Connecteur: "USB-C" }),
  tablet("iPad mini (6e génération)", 90_000, 3, { Stockage: "64 Go", Connectivité: "Wi-Fi" },
    "Le petit iPad de 8,3 pouces, qui tient dans une main.",
    { Système: "iPadOS", Connecteur: "USB-C" }),
  tablet("Galaxy Tab S11", 180_000, 3, { Stockage: "128 Go", RAM: "12 Go", Connectivité: "Wi-Fi" },
    "La tablette haut de gamme de Samsung, avec un écran Dynamic AMOLED 2X de 11 pouces.",
    { Système: "Android (One UI)", Connecteur: "USB-C" }),
  tablet("Galaxy Tab S10 Ultra", 200_000, 3, { Stockage: "256 Go", RAM: "12 Go", Connectivité: "Wi-Fi" },
    "La grande tablette de Samsung, avec un écran de 14,6 pouces et un S Pen fourni.",
    { Système: "Android (One UI)", Connecteur: "USB-C" }),
];
