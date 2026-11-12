import Link from "next/link";
import { Suspense, type CSSProperties } from "react";
import {
  ArrowRightIcon,
  InstagramIcon,
  SearchIcon,
} from "@/components/ui/icons";
import ScrollToHash from "@/components/ui/ScrollToHash";
import { STORE_INFO } from "@/config/storeInfo";
import HomeCategories from "@/features/categories/HomeCategories";
import { NeonSides } from "@/features/home/NeonLines";
import { StageLoading } from "@/features/home/DeviceStage";
import Guarantees from "@/features/home/Guarantees";
import Reveal from "@/features/home/Reveal";
import {
  AffairSheet,
  AffairShowcase,
  Deals,
  DealsBanner,
  HeroStage,
  LatestProducts,
  SectionLoading,
} from "@/features/home/HomeSections";
import {
  BOTTOM_GUARANTEES,
  DEALS_STAGE,
  HERO_STAGE,
  TOP_GUARANTEES,
} from "@/features/home/homeContent";

const LATEST_SIDE_DECORATION_WIDTH =
  "max(60px, calc((100vw - 1200px) / 2 + 60px))";

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
        {/* Sur mobile (11/11), le hero est resserré pour que « Voir la boutique » reste visible
            sans défiler, même sur un petit écran : espacements, titre et texte plus courts.
            Il est centré, comme l'image du dessous, avec une seule barre de recherche (la loupe
            dedans). Les écarts suivent les groupes : serrés dans un groupe (surtitre et titre,
            bouton et recherche), larges entre deux. À partir de sm, la mise en page d'origine. */}
        <div className="container-page grid items-center gap-10 py-10 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10 lg:py-16">
          <div className="space-y-8 text-center sm:space-y-6 sm:text-left">
            <p className="text-sm font-bold tracking-[0.14em] text-red uppercase max-sm:mb-4">
              Sélectionnés d&apos;Europe
            </p>
            <h1
              id="hero-title"
              // Sur mobile, la taille suit la largeur de l'écran : 32 px sur un petit
              // téléphone, environ 39 px sur un grand, pour tenir face à l'image.
              className="text-[clamp(2rem,9vw,2.5rem)] leading-[1.1] text-balance font-extrabold sm:text-wrap tracking-tight max-sm:mb-5 sm:text-5xl lg:text-[3.5rem]"
            >
              Le bon appareil.
              <span className="text-gradient mx-auto block w-fit pb-1 sm:mx-0">
                Neuf scellé ou en affaire.
              </span>
            </h1>
            <p className="mx-auto max-w-lg text-base text-ink-muted sm:mx-0 sm:text-lg">
              {/* Sur mobile, une phrase : le détail de la fiche est expliqué plus bas dans la page. */}
              <span className="sm:hidden">
                Chaque affaire est testée et décrite pièce par pièce.
              </span>
              <span className="hidden sm:inline">
                Smartphones, PC portables et tablettes importés d&apos;Europe.
                Chaque affaire est testée et décrite pièce par pièce : note,
                batterie, pièces changées et boîte.
              </span>
            </p>
            <div className="flex flex-wrap justify-center gap-3 max-sm:mb-5 sm:justify-start">
              <Link
                href="/boutique"
                className="btn btn-primary max-sm:min-h-12 max-sm:px-8"
              >
                Voir la boutique
                <ArrowRightIcon size={18} />
              </Link>
            </div>
            {/* Une simple form GET : chercher marche même sans JavaScript. */}
            <form
              action="/produits"
              role="search"
              className="relative mx-auto flex max-w-xs gap-2 sm:mx-0 sm:max-w-lg"
            >
              <label htmlFor="hero-search" className="sr-only">
                Quel modèle cherchez-vous ?
              </label>
              <input
                id="hero-search"
                name="q"
                type="search"
                className="input min-w-0 flex-1 pr-12 sm:pr-3"
                placeholder="Chercher un modèle…"
              />
              {/* Mobile : la loupe dans le champ. Ordinateur : le bouton « Chercher ». */}
              <button
                type="submit"
                aria-label="Chercher"
                className="absolute inset-y-0 right-0 grid w-12 place-items-center text-ink-muted hover:text-ink sm:hidden"
              >
                <SearchIcon size={20} />
              </button>
              <button
                type="submit"
                className="btn btn-secondary hidden sm:inline-flex"
              >
                Chercher
              </button>
            </form>
            <a
              href={STORE_INFO.instagram}
              rel="noopener noreferrer"
              target="_blank"
              className="group mx-auto flex w-fit items-center gap-3 text-left text-sm sm:mx-0"
            >
              <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-ink">
                <InstagramIcon size={18} />
              </span>
              <span className="text-ink-muted">
                <strong className="font-display text-ink group-hover:underline">
                  {STORE_INFO.instagramFollowers} abonnés
                </strong>{" "}
                <span className="hidden sm:inline">suivent DropZone </span>sur
                Instagram
              </span>
            </a>
          </div>
          <Suspense
            fallback={<StageLoading id="hero" className={HERO_STAGE} />}
          >
            <HeroStage />
          </Suspense>
        </div>
      </section>

      {/* 2. Les garanties, collées sous le hero. */}
      <Reveal>
        <section
          aria-label="Nos garanties"
          className="brand-dark border-t border-line bg-surface"
        >
          <div className="container-page py-6">
            <Guarantees items={TOP_GUARANTEES} />
          </div>
        </section>
      </Reveal>

      {/* 3. Les catégories. La section prend toute la largeur pour que les traits de néon
          (rouges à gauche, bleus à droite, comme derrière le socle) touchent les bords de
          l'écran ; le contenu reste centré au-dessus, dans container-page. */}
      <Reveal>
        <section
          id="categories"
          aria-labelledby="categories-title"
          className="relative scroll-mt-4 overflow-hidden"
        >
          <NeonSides id="categories" mobile />
          <div className="container-page relative z-10 pt-14 pb-6 sm:py-14">
            <ScrollToHash id="categories" />
            <div className="mb-8 text-center">
              <div className="flex items-center justify-center gap-4">
                {/* Courts sur mobile pour encadrer le titre sans le faire passer sur deux lignes. */}
                <span
                  className="rule-gradient w-6 sm:w-16"
                  aria-hidden="true"
                />
                <h2 id="categories-title" className="text-2xl sm:text-3xl">
                  Acheter par catégorie
                </h2>
                <span
                  className="rule-gradient w-6 -scale-x-100 sm:w-16"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-2 text-ink-muted">
                Trouvez l&apos;appareil qu&apos;il vous faut.
              </p>
            </div>
            {/* Lues dans l'API : la roue pendant l'attente, comme les autres parties de l'accueil. */}
            <Suspense
              fallback={<SectionLoading label="Chargement des catégories…" />}
            >
              <HomeCategories />
            </Suspense>
          </div>
        </section>
      </Reveal>

      {/* 4. Les derniers arrivages, avec les nouvelles cartes produit. */}
      <Reveal>
        <section
          aria-labelledby="latest-title"
          className="relative pt-6 pb-14 sm:py-14"
          style={
            {
              "--latest-side-decoration-width": LATEST_SIDE_DECORATION_WIDTH,
            } as CSSProperties
          }
        >
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden sm:hidden">
            <NeonSides id="latest-mobile" mobile extendMobile />
          </div>
          <div className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden sm:block">
            <div
              className="absolute inset-y-0 left-0 overflow-hidden"
              style={{ width: LATEST_SIDE_DECORATION_WIDTH }}
            >
              <NeonSides id="latest-left" side="left" />
            </div>
            <div
              className="absolute inset-y-0 right-0 overflow-hidden"
              style={{ width: LATEST_SIDE_DECORATION_WIDTH }}
            >
              <NeonSides id="latest-right" side="right" />
            </div>
          </div>
          <div className="container-page relative z-10 space-y-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-full">
                <div className="flex items-center justify-center gap-3">
                  <span className="rule-gradient w-6 sm:w-10" aria-hidden="true" />
                  <h2 id="latest-title" className="text-2xl sm:text-3xl">
                    Notre sélection
                  </h2>
                  <span className="rule-gradient w-6 -scale-x-100 sm:w-10" aria-hidden="true" />
                </div>
                <p className="mt-1 text-ink-muted">
                  Les derniers arrivages, neufs scellés et affaires.
                </p>
              </div>
              <Link
                href="/boutique"
                className="btn btn-outline btn-small btn-pill"
              >
                Aller à la Boutique
                <ArrowRightIcon size={16} />
              </Link>
            </div>
            <Suspense
              fallback={<SectionLoading label="Chargement de la sélection…" />}
            >
              <LatestProducts />
            </Suspense>
          </div>
        </section>
      </Reveal>

      {/* 5. Le bandeau des affaires : affiché avec sa roue pendant l'attente, retiré s'il n'y
          a finalement aucune affaire en stock. */}
      <Reveal>
        <Suspense
          fallback={
            <DealsBanner
              stage={<StageLoading id="deals" className={DEALS_STAGE} />}
            />
          }
        >
          <Deals />
        </Suspense>
      </Reveal>

      {/* 6. Ce qui distingue DropZone : la fiche d'une affaire, avec un vrai exemple. */}
      <Reveal>
        <Suspense
          fallback={
            <AffairSheet
              example={<SectionLoading label="Chargement d'un exemple…" />}
            />
          }
        >
          <AffairShowcase />
        </Suspense>
      </Reveal>

      {/* 7. Les garanties du bas. */}
      <Reveal>
        <section aria-label="DropZone en bref" className="container-page">
          <div className="brand-dark rounded-[var(--radius-block)] bg-surface px-6 py-7 sm:px-8">
            <Guarantees items={BOTTOM_GUARANTEES} />
          </div>
        </section>
      </Reveal>
    </>
  );
}
