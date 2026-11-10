import Link from "next/link";
import { Suspense } from "react";
import { ArrowRightIcon, InstagramIcon } from "@/components/ui/icons";
import ScrollToHash from "@/components/ui/ScrollToHash";
import { STORE_INFO } from "@/config/storeInfo";
import CategoryCards from "@/features/home/CategoryCards";
import { StageLoading } from "@/features/home/DeviceStage";
import Guarantees from "@/features/home/Guarantees";
import {
  AffairSheet,
  AffairShowcase,
  Deals,
  DealsBanner,
  HeroStage,
  LatestProducts,
  SectionLoading,
} from "@/features/home/HomeSections";
import { BOTTOM_GUARANTEES, DEALS_STAGE, HERO_STAGE, TOP_GUARANTEES } from "@/features/home/homeContent";

// L'accueil s'affiche tout de suite (06/11). Avant, la page attendait toutes les réponses de
// l'API pour s'afficher d'un bloc : quand Render réveille le serveur endormi (jusqu'à une
// minute), on ne voyait que les cartes grises de loading.tsx. Maintenant, seules les parties
// qui lisent l'API attendent, chacune dans son <Suspense> avec une roue de chargement : le
// serveur de Next envoie d'abord le reste de la page, puis chaque partie dès qu'elle est
// prête (le « streaming »). La page elle-même n'attend rien, donc loading.tsx ne s'affiche
// plus ici. Les parties qui lisent l'API sont dans features/home/HomeSections.tsx, les
// textes dans features/home/homeContent.tsx.
export default function HomePage() {
  return (
    <>
      {/* 1. Le hero : il suit le thème (noir en sombre, gris clair en clair), avec le même décor. */}
      <section
        aria-labelledby="hero-title"
        className="hero-glow relative overflow-hidden"
      >
        <div className="container-page grid items-center gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10 lg:py-16">
          <div className="space-y-6">
            <p className="text-sm font-bold tracking-[0.14em] text-red uppercase">
              Sélectionnés d&apos;Europe
            </p>
            <h1
              id="hero-title"
              className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-[3.5rem]"
            >
              Le bon appareil.
              <span className="text-gradient block w-fit pb-1">
                Neuf scellé ou en affaire.
              </span>
            </h1>
            <p className="max-w-lg text-lg text-ink-muted">
              Smartphones, PC portables et tablettes importés d&apos;Europe.
              Chaque affaire est testée et décrite pièce par pièce : note,
              batterie, pièces changées et boîte.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/boutique" className="btn btn-primary">
                Voir la boutique
                <ArrowRightIcon size={18} />
              </Link>
              <Link
                href="/boutique"
                className="btn btn-outline"
              >
                Les affaires
              </Link>
            </div>
            {/* Une simple form GET : chercher marche même sans JavaScript. */}
            <form
              action="/produits"
              role="search"
              className="flex max-w-lg gap-2"
            >
              <label htmlFor="hero-search" className="sr-only">
                Quel modèle cherchez-vous ?
              </label>
              <input
                id="hero-search"
                name="q"
                type="search"
                className="input min-w-0 flex-1"
                placeholder="Chercher un modèle…"
              />
              <button type="submit" className="btn btn-secondary">
                Chercher
              </button>
            </form>
            <a
              href={STORE_INFO.instagram}
              rel="noopener noreferrer"
              target="_blank"
              className="group inline-flex items-center gap-3 text-sm"
            >
              <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-ink">
                <InstagramIcon size={18} />
              </span>
              <span className="text-ink-muted">
                <strong className="font-display text-ink group-hover:underline">
                  {STORE_INFO.instagramFollowers} abonnés
                </strong>{" "}
                suivent DropZone sur Instagram
              </span>
            </a>
          </div>
          <Suspense fallback={<StageLoading id="hero" className={HERO_STAGE} />}>
            <HeroStage />
          </Suspense>
        </div>
      </section>

      {/* 2. Les garanties, collées sous le hero. */}
      <section
        aria-label="Nos garanties"
        className="brand-dark border-t border-line bg-surface"
      >
        <div className="container-page py-6">
          <Guarantees items={TOP_GUARANTEES} />
        </div>
      </section>

      {/* 3. Les catégories. */}
      <section
        id="categories"
        aria-labelledby="categories-title"
        className="container-page scroll-mt-4 py-14"
      >
        <ScrollToHash id="categories" />
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-4">
            {/* Les filets seulement à partir de sm : sur mobile, ils feraient passer le titre sur deux lignes. */}
            <span
              className="rule-gradient hidden w-16 sm:block"
              aria-hidden="true"
            />
            <h2 id="categories-title" className="text-2xl sm:text-3xl">
              Acheter par catégorie
            </h2>
            <span
              className="rule-gradient hidden w-16 -scale-x-100 sm:block"
              aria-hidden="true"
            />
          </div>
          <p className="mt-2 text-ink-muted">
            Trouvez l&apos;appareil qu&apos;il vous faut.
          </p>
        </div>
        <CategoryCards />
      </section>

      {/* 4. Le bandeau des affaires : affiché avec sa roue pendant l'attente, retiré s'il n'y
          a finalement aucune affaire en stock. */}
      <Suspense
        fallback={
          <DealsBanner
            stage={<StageLoading id="deals" className={DEALS_STAGE} />}
          />
        }
      >
        <Deals />
      </Suspense>

      {/* 5. Les derniers arrivages, avec les nouvelles cartes produit. */}
      <section
        aria-labelledby="latest-title"
        className="container-page space-y-6 py-14"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 id="latest-title" className="text-2xl sm:text-3xl">
                Notre sélection
              </h2>
              <span className="rule-gradient w-10" aria-hidden="true" />
            </div>
            <p className="mt-1 text-ink-muted">
              Les derniers arrivages, neufs scellés et affaires.
            </p>
          </div>
          <Link href="/boutique" className="btn btn-outline btn-small btn-pill">
            Aller à la Boutique
            <ArrowRightIcon size={16} />
          </Link>
        </div>
        <Suspense
          fallback={<SectionLoading label="Chargement de la sélection…" />}
        >
          <LatestProducts />
        </Suspense>
      </section>

      {/* 6. Ce qui distingue DropZone : la fiche d'une affaire, avec un vrai exemple. */}
      <Suspense
        fallback={
          <AffairSheet
            example={<SectionLoading label="Chargement d'un exemple…" />}
          />
        }
      >
        <AffairShowcase />
      </Suspense>

      {/* 7. Les garanties du bas. */}
      <section aria-label="DropZone en bref" className="container-page">
        <div className="brand-dark rounded-[var(--radius-block)] bg-surface px-6 py-7 sm:px-8">
          <Guarantees items={BOTTOM_GUARANTEES} />
        </div>
      </section>
    </>
  );
}
