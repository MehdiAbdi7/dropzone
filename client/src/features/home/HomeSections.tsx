import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "@/components/ui/icons";
import Spinner from "@/components/ui/Spinner";
import ConditionReport from "@/features/products/ConditionReport";
import ProductGrid from "@/features/products/ProductGrid";
import ArrivalsCarousel from "./ArrivalsCarousel";
import { publicFetch, publicFetchPage } from "@/lib/publicFetch";
import type { ProductCard, ProductDetail } from "@/types/api";
import DeviceStage from "./DeviceStage";
import { DEALS_STAGE, FAMILIES, HERO_STAGE } from "./homeContent";
import { showcaseUnit } from "./showcase";
import { dealDevices, heroDevices, type StagePhotos } from "./stageLayout";

// Les parties de l'accueil qui lisent l'API.
// Chacune est un Server Component async : tant que son `await` attend l'API, React montre
// à sa place le `fallback` de son <Suspense> (voir app/(shop)/page.tsx). Le hero et le bandeau
// demandent tous deux /stage : dans un même rendu, Next ne fait qu'un appel par adresse
// (voir publicFetch.ts).

// La roue à la place d'une partie qui attend l'API. min-h : la place réservée limite le
// saut de la page quand le contenu arrive.
export function SectionLoading({ label }: { label: string }) {
  return (
    <div className="grid min-h-72 place-items-center text-ink-muted">
      <Spinner label={label} />
    </div>
  );
}

// Les photos des deux socles, choisies dans le back-office (06/11) ; null : les dessins.
export async function HeroStage() {
  const stage = await publicFetch<StagePhotos>("/stage");
  return <DeviceStage id="hero" devices={heroDevices(stage)} className={HERO_STAGE} />;
}

export async function Deals() {
  const [deals, stage] = await Promise.all([
    publicFetchPage<ProductCard>("/products?condition=affaire&limit=1"),
    publicFetch<StagePhotos>("/stage"),
  ]);
  // Le bandeau des affaires n'apparaît que s'il y a vraiment des affaires en stock.
  if ((deals?.pagination.total ?? 0) === 0) {
    return null;
  }
  return (
    <DealsBanner
      stage={<DeviceStage id="deals" devices={dealDevices(stage)} className={DEALS_STAGE} />}
    />
  );
}

// Le bandeau lui-même : le même pendant l'attente (avec la roue) et une fois prêt.
export function DealsBanner({ stage }: { stage: ReactNode }) {
  return (
    <section aria-labelledby="deals-title" className="scroll-mt-4 px-8 py-14">
      {/* La bordure ne se voit qu'en thème sombre, où le bandeau touche un fond aussi noir que lui. */}
      <div className="brand-dark hero-glow relative grid items-center gap-6 overflow-hidden rounded-[var(--radius-block)] border border-line px-6 py-8 sm:px-10 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:py-6">
        <div className="relative z-10 space-y-4 text-center md:text-left">
          <p className="text-sm font-bold tracking-[0.14em] text-red uppercase">
            Les affaires du moment
          </p>
          <h2
            id="deals-title"
            className="text-3xl font-extrabold tracking-tight sm:text-4xl"
          >
            Testées et{" "}
            <span className="text-gradient">décrites pièce par pièce</span>
          </h2>
          <p className="mx-auto max-w-md text-ink-muted md:mx-0">
            Note, batterie, pièces d&apos;origine ou compatibles, avec ou sans
            boîte : chaque affaire a sa radiographie, et certaines ont des
            accessoires offerts.
          </p>
          <Link href="/boutique" className="btn btn-primary">
            Voir les affaires
            <ArrowRightIcon size={18} />
          </Link>
        </div>
        {stage}
      </div>
    </section>
  );
}

// Les 12 derniers arrivages (12/11) : les appareils en stock, du dernier ajouté au stock (nouvel
// exemplaire ou stock augmenté dans le back-office) au plus ancien. Les accessoires n'y sont pas.
export async function LatestProducts() {
  const latest = await publicFetchPage<ProductCard>("/products?sort=arrivages&appareils=1&enstock=1&limit=12");
  if (!latest) {
    return (
      <p role="alert" className="card p-6">
        Le catalogue ne répond pas pour le moment. Rechargez la page dans
        quelques secondes.
      </p>
    );
  }
  // Avec trop peu d'appareils, la boucle montrerait le même plusieurs fois côte à côte : la grille.
  return latest.data.length >= 5 ? <ArrivalsCarousel products={latest.data} /> : <ProductGrid products={latest.data} wide />;
}

// Une vraie affaire du stock, montrée avec sa fiche d'état.
export async function AffairShowcase() {
  const [complete, refurbished] = await Promise.all([
    // La vitrine : un smartphone dont une affaire dit sa note et sa batterie (les annonces
    // importées n'en disent souvent rien) ; à défaut, le plus récent qui a une affaire.
    publicFetchPage<ProductCard>(
      "/products?category=smartphones&condition=affaire&fiche=complete&limit=1",
    ),
    publicFetchPage<ProductCard>(
      "/products?category=smartphones&condition=affaire&limit=1",
    ),
  ]);
  const showcaseSlug = complete?.data[0]?.slug ?? refurbished?.data[0]?.slug;
  const showcase = showcaseSlug
    ? await publicFetch<ProductDetail>(`/products/${showcaseSlug}`)
    : null;
  // En vitrine : la fiche la plus complète, puis l'exemple le plus rassurant.
  const unit = showcase ? showcaseUnit(showcase.variants) : null;
  if (!showcase || !unit) {
    return <AffairSheet example={null} />;
  }
  const refurbishedUnits = showcase.variants.filter(
    (variant) => variant.condition === "refurbished",
  );
  const refurbishedCount = refurbishedUnits.reduce((sum, variant) => sum + variant.stock, 0);
  return (
    <AffairSheet
      example={
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">
            En stock en ce moment :{" "}
            <Link
              href={`/produits/${showcase.slug}`}
              className="font-semibold text-ink underline"
            >
              {showcase.name} en affaire
            </Link>
          </p>
          <ConditionReport
            variant={unit}
            action={
              <Link
                href={`/produits/${showcase.slug}`}
                className="btn btn-primary w-full"
              >
                {refurbishedCount > 1
                  ? `Comparer les ${refurbishedCount} appareils disponibles`
                  : "Voir l'appareil"}
              </Link>
            }
          />
        </div>
      }
    />
  );
}

// Les trois familles de la fiche, et à côté l'exemple (ou la roue pendant l'attente).
// Sans exemple, les familles prennent toute la largeur, sur trois colonnes.
export function AffairSheet({ example }: { example: ReactNode | null }) {
  return (
    <section aria-labelledby="families-title" className="container-page pb-14">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3">
          <span className="rule-gradient w-6 sm:w-16" aria-hidden="true" />
          <h2 id="families-title" className="text-2xl sm:text-3xl">
            Ce que dit la fiche d&apos;une affaire
          </h2>
          <span className="rule-gradient w-6 -scale-x-100 sm:w-16" aria-hidden="true" />
        </div>
        <p className="mx-auto mt-2 max-w-xl text-ink-muted">
          Avant de commander, vous voyez la note, la batterie et tout ce qui a
          été changé. Trois familles, toujours dans le même ordre.
        </p>
      </div>
      <div
        className={`grid gap-8 ${example ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start" : ""}`}
      >
        <ul className={`grid gap-3 ${example ? "" : "md:grid-cols-3"}`}>
          {FAMILIES.map((family) => (
            <li key={family.title} className="card flex gap-4 p-4">
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-full ${family.tone}`}
              >
                {family.icon}
              </span>
              <div>
                <h3 className="text-base">{family.title}</h3>
                <p className="mt-1 text-sm text-ink-muted">{family.text}</p>
              </div>
            </li>
          ))}
        </ul>
        {example}
      </div>
    </section>
  );
}
