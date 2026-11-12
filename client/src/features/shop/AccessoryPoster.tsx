import Link from "next/link";
import Logo from "@/components/ui/Logo";
import ProductImage from "@/components/ui/ProductImage";
import type { Palette } from "@/config/colors";
import { formatPrice } from "@/lib/format";
import type { AccessoryPosterProduct } from "@/types/api";
import { columnLabels, columnStatus, posterSubtitle, variantHref } from "./accessoryColumns";
import { kindIcon } from "./colors";
import PosterSlider from "./PosterSlider";
import { glowColor, posterLayout } from "./series";

// L'affiche d'un accessoire (12/11) : le même bloc sombre que l'affiche d'une série d'appareils,
// avec une colonne par variante (une puissance, un modèle de téléphone, un câble…) à glisser
// quand elles sont nombreuses (PosterSlider). Toute la colonne mène à la fiche, l'option déjà
// choisie. Une variante épuisée reste visible, grisée, sans lien. `heading` : h1 quand l'affiche
// est seule sur la page, h2 quand la page en montre plusieurs.
export default function AccessoryPoster({
  product,
  makerName,
  palette,
  heading = "h2",
  priority = false,
}: {
  product: AccessoryPosterProduct;
  makerName: string;
  palette: Palette;
  heading?: "h1" | "h2";
  priority?: boolean;
}) {
  const labels = columnLabels(product.variants);
  const count = product.variants.length;
  const Title = heading;
  const glow = glowColor(null, palette);
  const id = `poster-${product.slug}`;
  const photo = product.image ?? kindIcon("accessory");

  return (
    <section aria-labelledby={id} className="brand-dark poster">
      <div
        aria-hidden="true"
        className="poster-backdrop"
        style={{
          background: `radial-gradient(60% 80% at 0% 55%, ${glow}, transparent 70%), radial-gradient(60% 80% at 100% 55%, ${glow}, transparent 70%)`,
        }}
      />
      <header className="relative space-y-2 px-4 pt-5 text-center md:pt-6">
        <Logo />
        <Title id={id} className="poster-title text-3xl md:text-5xl">
          {product.name}
        </Title>
        <p className="text-xs tracking-[0.28em] text-white/70 uppercase">
          {makerName} · {posterSubtitle(count)}
        </p>
        {product.specs.length > 0 ? (
          <ul className="mx-auto flex max-w-2xl flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-white/80">
            {product.specs.slice(0, 4).map(([key, value]) => (
              <li key={key}>
                <span className="text-white/55">{key} : </span>
                {value}
              </li>
            ))}
          </ul>
        ) : null}
      </header>
      <div className="relative pt-2 pb-3">
        <PosterSlider names={labels} layout={posterLayout(count)}>
          {product.variants.map((variant, index) => {
            const status = columnStatus(variant.stock);
            const body = (
              <>
                <div className="relative h-28 w-full md:h-32">
                  <div
                    aria-hidden="true"
                    className="poster-glow"
                    style={{ background: `radial-gradient(closest-side, ${glow}, transparent 75%)` }}
                  />
                  <ProductImage src={photo} alt="" sizes="(min-width: 768px) 25vw, 78vw" priority={priority && index === 0} />
                </div>
                <h3 className={`text-lg font-bold text-white ${status ? "line-through" : ""}`}>{labels[index]}</h3>
                <div aria-hidden="true" className="h-px w-2/3 bg-white/15" />
                <div className="space-y-0.5 text-xs text-white/75">
                  <p>
                    <span className="font-display text-base font-extrabold whitespace-nowrap text-white">{formatPrice(variant.price)}</span>
                  </p>
                  <p className="font-semibold text-white">{status ?? "En stock"}</p>
                </div>
              </>
            );
            const className = "poster-column flex h-full flex-col items-center gap-2 rounded-2xl px-3 pb-3 text-center";
            return status ? (
              <div key={variant.sku} aria-disabled="true" className={`${className} opacity-50`}>
                {body}
              </div>
            ) : (
              <Link key={variant.sku} href={variantHref(product.slug, variant.options)} className={className}>
                {body}
              </Link>
            );
          })}
        </PosterSlider>
      </div>
    </section>
  );
}
