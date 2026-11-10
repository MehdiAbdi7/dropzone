import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import {
  AlertIcon,
  ArrowRightIcon,
  CashIcon,
  ClipboardCheckIcon,
  DocumentIcon,
  EyeIcon,
  GlobeIcon,
  InstagramIcon,
  PackageIcon,
  StoreIcon,
  SwapIcon,
  TruckIcon,
} from "@/components/ui/icons";
import ScrollToHash from "@/components/ui/ScrollToHash";
import Spinner from "@/components/ui/Spinner";
import { FREE_SHIPPING_FROM } from "@/config/shipping";
import { STORE_INFO } from "@/config/storeInfo";
import CategoryCards from "@/features/home/CategoryCards";
import DeviceStage, { StageLoading } from "@/features/home/DeviceStage";
import { dealDevices, heroDevices, type StagePhotos } from "@/features/home/stageLayout";
import Guarantees, { type Guarantee } from "@/features/home/Guarantees";
import { showcaseUnit } from "@/features/home/showcase";
import ConditionReport from "@/features/products/ConditionReport";
import ProductGrid from "@/features/products/ProductGrid";
import { formatPrice } from "@/lib/format";
import { publicFetch, publicFetchPage } from "@/lib/publicFetch";
import type { ProductCard, ProductDetail } from "@/types/api";

// Rien d'inventé : chaque garantie est un fait (règle du serveur, façon de vendre
// du magasin, chiffre relevé sur Instagram).
const TOP_GUARANTEES: Guarantee[] = [
  {
    icon: <GlobeIcon />,
    title: "Sélectionnés d'Europe",
    text: "Smartphones, PC et tablettes",
  },
  {
    icon: <TruckIcon />,
    title: "Livraison dans les 58 wilayas",
    text: `Offerte dès ${formatPrice(FREE_SHIPPING_FROM)}`,
  },
  {
    icon: <CashIcon />,
    title: "Paiement à la livraison",
    text: "Vous payez en recevant",
  },
  {
    icon: <ClipboardCheckIcon />,
    title: "Affaires décrites",
    text: "Note, batterie, pièces et défauts",
  },
];

const BOTTOM_GUARANTEES: Guarantee[] = [
  {
    icon: <StoreIcon />,
    title: `Magasin à ${STORE_INFO.town}`,
    text: STORE_INFO.city,
  },
  {
    icon: <PackageIcon />,
    title: "Suivi de commande",
    text: "Avec votre numéro et votre téléphone",
  },
  {
    icon: <InstagramIcon />,
    title: `${STORE_INFO.instagramFollowers} abonnés`,
    text: "Sur Instagram",
  },
  {
    icon: <DocumentIcon />,
    title: "Conditions claires",
    text: "Mentions légales et CGV",
  },
];

const FAMILIES = [
  {
    title: "Limitations",
    icon: <AlertIcon />,
    tone: "bg-red-soft text-red",
    text: "Ce que l'appareil ne fait pas, par exemple « Wi-Fi seulement ». Toujours affiché en premier, et à accepter avant de commander.",
  },
  {
    title: "Pièces remplacées",
    icon: <SwapIcon />,
    tone: "bg-blue-soft text-blue-ink",
    text: "Caméra, batterie ou écran changés : d'origine ou compatibles, on vous le dit pièce par pièce.",
  },
  {
    title: "Défauts visibles",
    icon: <EyeIcon />,
    tone: "bg-amber-soft text-amber",
    text: "Une rayure, un cache arrière fissuré : rien qui gêne l'usage, souvent invisible sous une coque.",
  },
];

const HERO_STAGE = "mx-auto w-full max-w-[360px] sm:max-w-[460px] lg:max-w-[580px]";
const DEALS_STAGE = "mx-auto w-full max-w-[300px] md:max-w-[380px]";

// L'accueil s'affiche tout de suite (06/11). Avant, la page attendait toutes les réponses de
// l'API pour s'afficher d'un bloc : quand Render réveille le serveur endormi (jusqu'à une
// minute), on ne voyait que les cartes grises de loading.tsx. Maintenant, seules les parties
// qui lisent l'API attendent, chacune dans son <Suspense> avec une roue de chargement : le
// serveur de Next envoie d'abord le reste de la page, puis chaque partie dès qu'elle est
// prête (le « streaming »). La page elle-même n'attend rien, donc loading.tsx ne s'affiche
// plus ici.
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

// ---------- Les parties qui lisent l'API ----------
// Chacune est un Server Component async : tant que son `await` attend l'API, React montre
// à sa place le `fallback` de son <Suspense>. Le hero et le bandeau demandent tous deux
// /stage : dans un même rendu, Next ne fait qu'un appel par adresse (voir publicFetch.ts).

// La roue à la place d'une partie qui attend l'API. min-h : la place réservée limite le
// saut de la page quand le contenu arrive.
function SectionLoading({ label }: { label: string }) {
  return (
    <div className="grid min-h-72 place-items-center text-ink-muted">
      <Spinner label={label} />
    </div>
  );
}

// Les photos des deux socles, choisies dans le back-office (06/11) ; null : les dessins.
async function HeroStage() {
  const stage = await publicFetch<StagePhotos>("/stage");
  return <DeviceStage id="hero" devices={heroDevices(stage)} className={HERO_STAGE} />;
}

async function Deals() {
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
function DealsBanner({ stage }: { stage: ReactNode }) {
  return (
    <section aria-labelledby="deals-title" className="scroll-mt-4 px-8 py-14">
      {/* La bordure ne se voit qu'en thème sombre, où le bandeau touche un fond aussi noir que lui. */}
      <div className="brand-dark hero-glow relative grid items-center gap-6 overflow-hidden rounded-[var(--radius-block)] border border-line px-6 py-8 sm:px-10 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:py-6">
        <div className="relative z-10 space-y-4">
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
          <p className="max-w-md text-ink-muted">
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

async function LatestProducts() {
  const latest = await publicFetchPage<ProductCard>("/products?limit=5");
  if (!latest) {
    return (
      <p role="alert" className="card p-6">
        Le catalogue ne répond pas pour le moment. Rechargez la page dans
        quelques secondes.
      </p>
    );
  }
  return <ProductGrid products={latest.data} wide />;
}

// Une vraie affaire du stock, montrée avec sa fiche d'état.
async function AffairShowcase() {
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
function AffairSheet({ example }: { example: ReactNode | null }) {
  return (
    <section aria-labelledby="families-title" className="container-page pb-14">
      <div
        className={`grid gap-8 ${example ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start" : ""}`}
      >
        <div className="space-y-5">
          <div>
            <h2 id="families-title" className="text-2xl sm:text-3xl">
              Ce que dit la fiche d&apos;une affaire
            </h2>
            <p className="mt-2 max-w-xl text-ink-muted">
              Avant de commander, vous voyez la note, la batterie et tout ce qui
              a été changé. Trois familles, toujours dans le même ordre.
            </p>
          </div>
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
        </div>
        {example}
      </div>
    </section>
  );
}
