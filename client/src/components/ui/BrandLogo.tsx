import Image from "next/image";

// Le logo d'une marque, dans une puce. Les logos de la bibliothèque (/brands/*.svg,
// Simple Icons) sont d'une seule couleur : on s'en sert comme d'un masque peint avec
// la couleur du texte, donc ils suivent le thème et l'état sélectionné de la puce.
// Un logo envoyé (Cloudinary) garde ses couleurs, sur un petit fond blanc.
export default function BrandLogo({ url, size = 16 }: { url: string | null; size?: number }) {
  if (!url) {
    return null;
  }
  if (url.startsWith("/brands/")) {
    return (
      <span
        aria-hidden="true"
        className="inline-block shrink-0 bg-current"
        style={{
          width: size,
          height: size,
          mask: `url(${url}) center / contain no-repeat`,
          WebkitMask: `url(${url}) center / contain no-repeat`,
        }}
      />
    );
  }
  return (
    <Image
      src={url}
      alt=""
      width={size + 4}
      height={size + 4}
      className="shrink-0 rounded-sm bg-white object-contain p-0.5"
    />
  );
}
