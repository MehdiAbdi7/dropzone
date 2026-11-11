import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import { DEVICE_KINDS } from "@/config/catalog";
import type { Category } from "@/types/api";
import { countLabel } from "./labels";
import { splitBrands } from "./tiles";

// Les marques d'une catégorie (11/11). Les plus demandées (au plus trois, chacune avec au moins
// 15 % des produits) ont une grande tuile : leur logo en grand, en filigrane, sur une lueur, le
// nom et le nombre de modèles. Ni photo, ni prix, ni bouton « Voir » (choix de Mehdi : toute la
// tuile est le lien). Les autres sont des tuiles compactes, qui tiennent en peu de place même
// quand il y en a douze.

// Écrites en entier : Tailwind ne devine pas les noms construits.
const COLUMNS: Record<number, string> = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" };

// La même lueur par rang que sur l'accueil, pour que les marques ne soient pas toutes pareilles.
const GLOWS = ["rgb(61 75 255 / 0.30)", "rgb(255 46 77 / 0.24)", "rgb(162 59 240 / 0.26)"];

export default function BrandTiles({ category }: { category: Category }) {
  const isDevice = DEVICE_KINDS.includes(category.kind);
  const { majors, minors } = splitBrands(category.brands, category.productCount);
  const href = (slug: string) => `/boutique/${category.slug}/${slug}`;

  return (
    <div className="space-y-8">
      {majors.length > 0 ? (
        <section aria-labelledby="majors-title" className="space-y-3">
          <h2 id="majors-title" className="text-xl">
            Les plus demandées
          </h2>
          <ul className={`grid gap-3 sm:gap-4 ${COLUMNS[majors.length]}`}>
            {majors.map((brand, index) => (
              <li key={brand.slug} className="flex">
                <Link
                  href={href(brand.slug)}
                  className="card group relative flex min-h-36 w-full flex-col justify-center overflow-hidden p-5 transition-[border-color,transform] hover:-translate-y-0.5 sm:min-h-44"
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{ background: `radial-gradient(55% 70% at 78% 45%, ${GLOWS[index % GLOWS.length]}, transparent 70%)` }}
                  />
                  {/* Le logo en grand, en filigrane, sur la lueur (choix de Mehdi : pas de photo). */}
                  {brand.logoUrl ? (
                    <div aria-hidden="true" className="absolute inset-y-0 right-6 grid place-items-center text-ink opacity-15 transition-opacity group-hover:opacity-25">
                      <BrandLogo url={brand.logoUrl} size={112} />
                    </div>
                  ) : null}
                  <div className="relative z-10 max-w-[60%] space-y-1">
                    <BrandLogo url={brand.logoUrl} size={30} />
                    <h3 className="font-display text-xl font-extrabold sm:text-2xl">{brand.name}</h3>
                    <p className="text-sm font-semibold">{countLabel(category.kind, brand.productCount)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {minors.length > 0 || category.hasUnbranded ? (
        <section aria-labelledby="minors-title" className="space-y-3">
          <h2 id="minors-title" className="text-xl">
            {majors.length > 0 ? (isDevice ? "Autres marques" : "Autres types") : isDevice ? "Marques" : "Types"}
          </h2>
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-3">
            {minors.map((brand) => (
              <li key={brand.slug} className="flex">
                <Link
                  href={href(brand.slug)}
                  className="card group flex w-full items-center gap-3 px-4 py-3 transition-[border-color,transform] hover:-translate-y-0.5"
                >
                  <span className="grid size-8 shrink-0 place-items-center">
                    {brand.logoUrl ? (
                      <BrandLogo url={brand.logoUrl} size={26} className="group-hover:text-blue-ink" />
                    ) : (
                      <span aria-hidden="true" className="font-display text-lg font-bold text-ink-muted">
                        {brand.name.charAt(0)}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-display font-bold group-hover:text-blue-ink">{brand.name}</span>
                    <span className="block text-xs text-ink-muted">{countLabel(category.kind, brand.productCount)}</span>
                  </span>
                </Link>
              </li>
            ))}
            {category.hasUnbranded ? (
              <li className="flex">
                <Link
                  href={href("autres")}
                  className="card group flex w-full items-center gap-3 px-4 py-3 transition-[border-color,transform] hover:-translate-y-0.5"
                >
                  <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center font-display text-lg font-bold text-ink-muted">
                    …
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-display font-bold group-hover:text-blue-ink">Autres</span>
                    <span className="block text-xs text-ink-muted">{isDevice ? "Sans marque" : "Sans type"}</span>
                  </span>
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
