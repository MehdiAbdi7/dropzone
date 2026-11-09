import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import { ArrowRightIcon } from "@/components/ui/icons";
import type { ProductKind } from "@/types/api";

// L'image de chaque sorte de catégorie, partagée par l'accueil et la Boutique
// (à remplacer par les photos de Mehdi, ici seulement).
export const KIND_IMAGES: Record<ProductKind, string> = {
  phone: "/products/phone.svg",
  tablet: "/products/tablet.svg",
  laptop: "/products/laptop.svg",
  watch: "/products/watch.svg",
  accessory: "/products/charger.svg",
  audiovisual: "/products/speaker.svg",
};

// Les cinq entrées de l'accueil : ce que DropZone vend (relevé Instagram du 04/11, ni
// montres ni audiovisuel). Les slugs sont ceux des catégories de l'API ; elles mènent
// dans le parcours de la Boutique.
const CATEGORIES = [
  {
    label: "Smartphones",
    href: "/boutique/smartphones",
    image: KIND_IMAGES.phone,
  },
  {
    label: "PC portables",
    href: "/boutique/ordinateurs-portables",
    image: KIND_IMAGES.laptop,
  },
  {
    label: "Tablettes",
    href: "/boutique/tablettes",
    image: KIND_IMAGES.tablet,
  },
  {
    label: "Accessoires",
    href: "/boutique/accessoires",
    image: KIND_IMAGES.accessory,
  },
  {
    label: "Affaires",
    href: "/boutique",
    image: KIND_IMAGES.phone,
  },
];

export default function CategoryCards() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
      {CATEGORIES.map((category) => (
        <li key={category.href} className="flex">
          <Link
            href={category.href}
            className="card group flex w-full flex-col items-center gap-2 p-2.5 pb-4 text-center transition-[border-color,box-shadow] hover:border-b-blue-ink hover:shadow-[var(--shadow)] sm:p-3 sm:pb-4"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-[10px] bg-surface-2">
              <ProductImage
                src={category.image}
                alt=""
                sizes="(min-width: 1024px) 200px, (min-width: 768px) 33vw, 50vw"
              />
            </div>
            <span className="font-display font-bold group-hover:text-blue-ink">
              {category.label}
            </span>
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
