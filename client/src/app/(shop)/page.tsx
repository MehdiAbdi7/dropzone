import Link from "next/link";
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
import { FREE_SHIPPING_FROM } from "@/config/shipping";
import { STORE_INFO } from "@/config/storeInfo";
import CategoryCards from "@/features/home/CategoryCards";
import DeviceStage, { DEAL_DEVICES, HERO_DEVICES } from "@/features/home/DeviceStage";
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
  { icon: <GlobeIcon />, title: "Sélectionnés d'Europe", text: "Smartphones, PC et tablettes" },
  { icon: <TruckIcon />, title: "Livraison dans les 58 wilayas", text: `Offerte dès ${formatPrice(FREE_SHIPPING_FROM)}` },
  { icon: <CashIcon />, title: "Paiement à la livraison", text: "Vous payez en recevant" },
  { icon: <ClipboardCheckIcon />, title: "Affaires décrites", text: "Note, batterie, pièces et défauts" },
];

const BOTTOM_GUARANTEES: Guarantee[] = [
  { icon: <StoreIcon />, title: `Magasin à ${STORE_INFO.town}`, text: STORE_INFO.city },
  { icon: <PackageIcon />, title: "Suivi de commande", text: "Avec votre numéro et votre téléphone" },
  { icon: <InstagramIcon />, title: `${STORE_INFO.instagramFollowers} abonnés`, text: "Sur Instagram" },
  { icon: <DocumentIcon />, title: "Conditions claires", text: "Mentions légales et CGV" },
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

export default async function HomePage() {
  const [latest, complete, refurbished, deals] = await Promise.all([
    publicFetchPage<ProductCard>("/products?limit=6"),
    // La vitrine : un smartphone dont une affaire dit sa note et sa batterie (les annonces
    // importées n'en disent souvent rien) ; à défaut, le plus récent qui a une affaire.
    publicFetchPage<ProductCard>("/products?category=smartphones&condition=affaire&fiche=complete&limit=1"),
    publicFetchPage<ProductCard>("/products?category=smartphones&condition=affaire&limit=1"),
    publicFetchPage<ProductCard>("/products?condition=affaire&limit=1"),
  ]);

  // Une vraie affaire du stock, montrée avec sa fiche d'état.
  const showcaseSlug = complete?.data[0]?.slug ?? refurbished?.data[0]?.slug;
  const showcase = showcaseSlug ? await publicFetch<ProductDetail>(`/products/${showcaseSlug}`) : null;
  // En vitrine : la fiche la plus complète, puis l'exemple le plus rassurant.
  const unit = showcase ? showcaseUnit(showcase.variants) : null;
  const refurbishedUnits = showcase?.variants.filter((variant) => variant.condition === "refurbished") ?? [];
  // Le bandeau des affaires n'apparaît que s'il y a vraiment des affaires en stock.
  const hasDeals = (deals?.pagination.total ?? 0) > 0;

  return (
    <>
      {/* 1. Le hero : il suit le thème (noir en sombre, gris clair en clair), avec le même décor. */}
      <section aria-labelledby="hero-title" className="hero-glow relative overflow-hidden">
        <div className="container-page grid items-center gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10 lg:py-16">
          <div className="space-y-6">
            <p className="text-sm font-bold tracking-[0.14em] text-red uppercase">Sélectionnés d&apos;Europe</p>
            <h1 id="hero-title" className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-[3.5rem]">
              Le bon appareil.
              <span className="text-gradient block w-fit pb-1">Neuf scellé ou en affaire.</span>
            </h1>
            <p className="max-w-lg text-lg text-ink-muted">
              Smartphones, PC portables et tablettes importés d&apos;Europe. Chaque affaire est testée et décrite
              pièce par pièce : note, batterie, pièces changées et boîte.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/boutique" className="btn btn-primary">
                Voir la boutique
                <ArrowRightIcon size={18} />
              </Link>
              <Link href="/produits?condition=affaire" className="btn btn-outline">
                Les affaires
              </Link>
            </div>
            {/* Une simple form GET : chercher marche même sans JavaScript. */}
            <form action="/produits" role="search" className="flex max-w-lg gap-2">
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
          <DeviceStage id="hero" devices={HERO_DEVICES} className="mx-auto w-full max-w-[360px] sm:max-w-[460px] lg:max-w-[580px]" />
        </div>
      </section>

      {/* 2. Les garanties, collées sous le hero. */}
      <section aria-label="Nos garanties" className="brand-dark border-t border-line bg-surface">
        <div className="container-page py-6">
          <Guarantees items={TOP_GUARANTEES} />
        </div>
      </section>

      {/* 3. Les catégories. */}
      <section id="categories" aria-labelledby="categories-title" className="container-page scroll-mt-4 py-14">
        <ScrollToHash id="categories" />
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-4">
            {/* Les filets seulement à partir de sm : sur mobile, ils feraient passer le titre sur deux lignes. */}
            <span className="rule-gradient hidden w-16 sm:block" aria-hidden="true" />
            <h2 id="categories-title" className="text-2xl sm:text-3xl">
              Acheter par catégorie
            </h2>
            <span className="rule-gradient hidden w-16 -scale-x-100 sm:block" aria-hidden="true" />
          </div>
          <p className="mt-2 text-ink-muted">Trouvez l&apos;appareil qu&apos;il vous faut.</p>
        </div>
        <CategoryCards />
      </section>

      {/* 4. Le bandeau des affaires. */}
      {hasDeals ? (
        <section aria-labelledby="deals-title" className="container-page">
          {/* La bordure ne se voit qu'en thème sombre, où le bandeau touche un fond aussi noir que lui. */}
          <div className="brand-dark hero-glow relative grid items-center gap-6 overflow-hidden rounded-[var(--radius-block)] border border-line px-6 py-8 sm:px-10 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:py-6">
            <div className="relative z-10 space-y-4">
              <p className="text-sm font-bold tracking-[0.14em] text-red uppercase">Les affaires du moment</p>
              <h2 id="deals-title" className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Testées et <span className="text-gradient">décrites pièce par pièce</span>
              </h2>
              <p className="max-w-md text-ink-muted">
                Note, batterie, pièces d&apos;origine ou compatibles, avec ou sans boîte : chaque affaire a sa
                radiographie, et certaines ont des accessoires offerts.
              </p>
              <Link href="/produits?condition=affaire" className="btn btn-primary">
                Voir les affaires
                <ArrowRightIcon size={18} />
              </Link>
            </div>
            <DeviceStage id="deals" devices={DEAL_DEVICES} className="mx-auto w-full max-w-[300px] md:max-w-[380px]" />
          </div>
        </section>
      ) : null}

      {/* 5. Les derniers arrivages, avec les nouvelles cartes produit. */}
      <section aria-labelledby="latest-title" className="container-page space-y-6 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 id="latest-title" className="text-2xl sm:text-3xl">
                Notre sélection
              </h2>
              <span className="rule-gradient w-10" aria-hidden="true" />
            </div>
            <p className="mt-1 text-ink-muted">Les derniers arrivages, neufs scellés et affaires.</p>
          </div>
          <Link href="/boutique" className="btn btn-outline btn-small btn-pill">
            Aller à la Boutique
            <ArrowRightIcon size={16} />
          </Link>
        </div>
        {latest ? (
          <ProductGrid products={latest.data} wide />
        ) : (
          <p role="alert" className="card p-6">
            Le catalogue ne répond pas pour le moment. Rechargez la page dans quelques secondes.
          </p>
        )}
      </section>

      {/* 6. Ce qui distingue DropZone : la fiche d'une affaire, avec un vrai exemple. */}
      <section aria-labelledby="families-title" className="container-page pb-14">
        <div className={`grid gap-8 ${showcase && unit ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start" : ""}`}>
          <div className="space-y-5">
            <div>
              <h2 id="families-title" className="text-2xl sm:text-3xl">
                Ce que dit la fiche d&apos;une affaire
              </h2>
              <p className="mt-2 max-w-xl text-ink-muted">
                Avant de commander, vous voyez la note, la batterie et tout ce qui a été changé. Trois familles,
                toujours dans le même ordre.
              </p>
            </div>
            <ul className={`grid gap-3 ${showcase && unit ? "" : "md:grid-cols-3"}`}>
              {FAMILIES.map((family) => (
                <li key={family.title} className="card flex gap-4 p-4">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-full ${family.tone}`}>
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

          {showcase && unit ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-muted">
                En stock en ce moment :{" "}
                <Link href={`/produits/${showcase.slug}`} className="font-semibold text-ink underline">
                  {showcase.name} en affaire
                </Link>
              </p>
              <ConditionReport
                variant={unit}
                action={
                  <Link href={`/produits/${showcase.slug}`} className="btn btn-primary w-full">
                    {refurbishedUnits.length > 1
                      ? `Comparer les ${refurbishedUnits.length} appareils disponibles`
                      : "Voir l'appareil"}
                  </Link>
                }
              />
            </div>
          ) : null}
        </div>
      </section>

      {/* 7. Les garanties du bas. */}
      <section aria-label="DropZone en bref" className="container-page">
        <div className="brand-dark rounded-[var(--radius-block)] bg-surface px-6 py-7 sm:px-8">
          <Guarantees items={BOTTOM_GUARANTEES} />
        </div>
      </section>
    </>
  );
}
