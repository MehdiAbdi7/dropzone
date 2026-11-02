import Image from "next/image";

// L'image d'un produit : une photo Cloudinary (optimisée par Next) ou une
// illustration SVG du catalogue de démo (servie telle quelle).
export default function ProductImage({
  src,
  alt,
  sizes,
  priority = false,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  if (!src) {
    return <div className="h-full w-full bg-surface-2" aria-hidden="true" />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={src.endsWith(".svg")}
      className="object-contain p-4"
    />
  );
}
