import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import { ArrowRightIcon } from "@/components/ui/icons";

// Les six entrées de la boutique. Les slugs sont ceux des catégories de l'API
// (seed) ; Reconditionnés est un filtre du catalogue, pas une catégorie.
const CATEGORIES = [
  { label: "Smartphones", href: "/produits?category=smartphones", image: "/products/phone.svg" },
  { label: "PC portables", href: "/produits?category=ordinateurs-portables", image: "/products/laptop.svg" },
  { label: "Montres", href: "/produits?category=montres-connectees", image: "/products/watch.svg" },
  { label: "Accessoires", href: "/produits?category=accessoires", image: "/products/charger.svg" },
  { label: "Audiovisuel", href: "/produits?category=audiovisuel", image: "/products/speaker.svg" },
  { label: "Reconditionnés", href: "/produits?condition=reconditionne", image: "/products/phone.svg" },
];

export default function CategoryCards() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
      {CATEGORIES.map((category) => (
        <li key={category.href} className="flex">
          <Link
            href={category.href}
            className="card group flex w-full flex-col items-center gap-2 p-2.5 pb-4 text-center transition-[border-color,box-shadow] hover:border-blue-ink hover:shadow-[var(--shadow)] sm:p-3 sm:pb-4"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-[10px] bg-surface-2">
              <ProductImage src={category.image} alt="" sizes="(min-width: 1024px) 180px, (min-width: 768px) 33vw, 50vw" />
            </div>
            <span className="font-display font-bold group-hover:text-blue-ink">{category.label}</span>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-red">
              Voir
              <ArrowRightIcon size={15} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
