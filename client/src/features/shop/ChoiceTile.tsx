import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import ProductImage from "@/components/ui/ProductImage";

// Une carte d'étape de la Boutique (une catégorie, une marque, « Autres ») : une image
// ou un logo, un nom, une petite ligne. `disabled` : grisée, barrée, rendue sans lien
// (règle du parcours : ce qui manque se voit, mais ne se clique pas).
export default function ChoiceTile({
  href,
  label,
  image,
  logoUrl,
  hint,
  disabled = false,
}: {
  href: string;
  label: string;
  image?: string;
  logoUrl?: string | null;
  hint?: string;
  disabled?: boolean;
}) {
  const body = (
    <>
      <div className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-field bg-surface-2">
        {image ? (
          <ProductImage
            src={image}
            alt=""
            sizes="(min-width: 1024px) 200px, (min-width: 768px) 33vw, 50vw"
          />
        ) : logoUrl ? (
          // group-hover : le logo devient bleu dès qu'on survole la tuile (le lien porte
          // la classe group), comme son nom, et pas seulement quand on survole le logo.
          <BrandLogo
            url={logoUrl}
            size={76}
            className="group-hover:text-blue-ink"
          />
        ) : (
          <span
            aria-hidden="true"
            className="font-display text-4xl font-bold text-ink-muted"
          >
            {label.charAt(0)}
          </span>
        )}
      </div>
      <span
        className={`font-display font-bold ${disabled ? "line-through" : "group-hover:text-blue-ink"}`}
      >
        {label}
      </span>
      {hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
    </>
  );

  const className =
    "card flex w-full flex-col items-center gap-1.5 p-2.5 pb-4 text-center sm:p-3 sm:pb-4";
  if (disabled) {
    return (
      <div aria-disabled="true" className={`${className} opacity-50`}>
        {body}
      </div>
    );
  }
  return (
    <Link
      href={href}
      className={`${className} group transition-[border-color,box-shadow] hover:border-b-blue-ink hover:shadow-(--shadow)`}
    >
      {body}
    </Link>
  );
}
