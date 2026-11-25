import Image from "next/image";

// L'image d'un produit : une photo Cloudinary (optimisée par Next) ou une
// illustration SVG du catalogue de démo (servie telle quelle).
export default function ProductImage({
  src,
  alt,
  sizes,
  priority = false,
  eager = false,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  // Chargée tout de suite, sans être préchargée dans le <head> (≠ `priority`) : les copies d'un carrousel en boucle,
  // dont les images « à la demande » arrivaient trop tard et laissaient des cartes blanches (25/11).
  eager?: boolean;
}) {
  if (!src) {
    return <div className="h-full w-full " aria-hidden="true" />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      loading={eager ? "eager" : undefined}
      unoptimized={src.endsWith(".svg")}
      className="object-contain p-4"
    />
  );
}
