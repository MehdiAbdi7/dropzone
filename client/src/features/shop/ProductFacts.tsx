import Link from "next/link";
import { SPEC_ORDER } from "@/config/catalog";
import { orderedEntries } from "@/lib/format";
import type { ProductDetail } from "@/types/api";

// La description, les modèles compatibles et les caractéristiques d'un produit : à chaque
// étape du parcours (décision de Mehdi du 05/11).
export default function ProductFacts({ product, withDescription = true }: { product: ProductDetail; withDescription?: boolean }) {
  const specs = orderedEntries(product.specs, SPEC_ORDER);
  return (
    <div className="space-y-5">
      {withDescription ? <p className="max-w-prose text-ink-muted">{product.description}</p> : null}

      {product.compatibleModels.length > 0 ? (
        <p className="text-sm">
          <span className="font-semibold">Compatible avec : </span>
          {product.compatibleModels.map((model, index) => (
            <span key={model.slug}>
              {index > 0 ? ", " : ""}
              <Link href={`/produits?model=${model.slug}`} className="text-blue-ink underline">
                {model.name}
              </Link>
            </span>
          ))}
        </p>
      ) : null}

      {specs.length > 0 ? (
        <section aria-labelledby="specs" className="space-y-3">
          <h2 id="specs" className="text-xl">
            Caractéristiques
          </h2>
          <dl className="card divide-y divide-line">
            {specs.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-3 text-sm">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
