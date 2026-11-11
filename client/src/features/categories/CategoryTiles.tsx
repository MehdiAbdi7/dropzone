import Link from "next/link";
import { ArrowRightIcon } from "@/components/ui/icons";
import { publicFetch } from "@/lib/publicFetch";
import type { Category } from "@/types/api";
import CategoryArt from "./CategoryArt";
import { countLabel, startingPrice } from "./labels";
import { homeCategories, layoutTiles, type TileSize } from "./tiles";

// Les catégories de l'accueil (11/11) : une grille de tuiles où la catégorie mise en avant est
// la plus grande, et où rien ne manque ni ne déborde, quel que soit le nombre de catégories
// (layoutTiles, tiles.ts). Tout vient de l'API : une catégorie créée dans le back-office
// apparaît ici toute seule, avec la composition de photos réglée dans Personnalisation.

// Les classes de chaque taille : une pour le téléphone (2 colonnes), une pour l'ordinateur
// (4 colonnes, à partir de lg). Écrites en entier : Tailwind ne devine pas les noms construits.
const PHONE: Record<TileSize, string> = {
  full: "col-span-2",
  big: "col-span-2",
  wide: "col-span-2",
  tile: "col-span-1",
};
const DESKTOP: Record<TileSize, string> = {
  full: "lg:col-span-4 lg:row-span-2",
  big: "lg:col-span-2 lg:row-span-2",
  wide: "lg:col-span-2 lg:row-span-1",
  tile: "lg:col-span-1 lg:row-span-1",
};

// Une lueur différente derrière chaque tuile, pour les distinguer d'un coup d'œil.
const GLOWS = [
  "rgb(61 75 255 / 0.32)",
  "rgb(255 46 77 / 0.26)",
  "rgb(162 59 240 / 0.28)",
  "rgb(14 165 233 / 0.26)",
  "rgb(34 197 94 / 0.22)",
  "rgb(245 158 11 / 0.24)",
];

export default async function CategoryTiles() {
  const categories = await publicFetch<Category[]>("/categories");
  if (!categories) {
    return (
      <p role="alert" className="card p-6">
        Les catégories ne répondent pas pour le moment. Rechargez la page dans quelques secondes.
      </p>
    );
  }
  const { shown, hidden } = homeCategories(categories);
  const phone = layoutTiles(shown.length, 2);
  const desktop = layoutTiles(shown.length, 4);

  return (
    <div className="space-y-5">
      <ul className="grid auto-rows-[200px] grid-cols-2 gap-3 sm:gap-4 lg:auto-rows-[250px] lg:grid-cols-4">
        {shown.map((category, index) => (
          <li key={category.slug} className={`flex ${PHONE[phone[index]]} ${DESKTOP[desktop[index]]}`}>
            <Link
              href={`/boutique/${category.slug}`}
              className="card group relative block w-full overflow-hidden transition-[border-color,transform] hover:-translate-y-0.5"
            >
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: `radial-gradient(60% 60% at 50% 38%, ${GLOWS[index % GLOWS.length]}, transparent 70%)` }}
              />
              {/* Sur téléphone, la tuile d'une case est étroite : l'image reste au-dessus d'un nom qui peut passer sur deux lignes. */}
              <CategoryArt
                category={{ kind: category.kind, photos: category.photos, fallbackImage: category.fallbackImage }}
                className={`absolute inset-x-2 top-3 transition-transform duration-300 group-hover:-translate-y-1 lg:bottom-[34%] ${phone[index] === "tile" ? "bottom-[46%]" : "bottom-[34%]"}`}
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-[48%]"
                style={{ background: "linear-gradient(to top, var(--color-surface) 24%, transparent)" }}
              />
              <span
                aria-hidden="true"
                // Sur une petite tuile du téléphone, la flèche chevaucherait la photo : masquée (toute la tuile est le lien).
                className={`absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full border border-line bg-surface-2/70 text-ink transition-colors group-hover:border-red group-hover:bg-red group-hover:text-on-red ${phone[index] === "tile" ? "max-sm:hidden" : ""}`}
              >
                <ArrowRightIcon size={16} />
              </span>
              <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5">
                <h3
                  className={`font-display leading-tight font-extrabold ${phone[index] === "tile" ? "text-base sm:text-lg" : "text-xl"} ${desktop[index] === "big" || desktop[index] === "full" ? "lg:text-3xl" : "lg:text-xl"}`}
                >
                  {category.name}
                </h3>
                <p className="mt-0.5 text-xs text-ink-muted sm:text-sm">
                  <span>{countLabel(category.kind, category.productCount)}</span>
                  {/* Le prix de départ ne tient pas sur une tuile d'une case sous 640 px. */}
                  {startingPrice(category.minPrice) ? (
                    <span className={phone[index] === "tile" ? "max-sm:hidden" : undefined}> · {startingPrice(category.minPrice)}</span>
                  ) : null}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <p className="text-center">
          <Link href="/boutique" className="btn btn-outline btn-small btn-pill">
            Toutes les catégories
            <ArrowRightIcon size={16} />
          </Link>
        </p>
      ) : null}
    </div>
  );
}
