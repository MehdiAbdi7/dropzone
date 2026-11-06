"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Field from "@/components/ui/Field";
import { CONDITION_LABELS } from "@/config/catalog";
import { clearCart, openCart } from "@/features/cart/cartSlice";
import CartSummary from "@/features/cart/CartSummary";
import { WILAYAS } from "@/config/wilayas";
import { errorMessage } from "@/lib/errors";
import { formatOptions, formatPrice } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useHydrated } from "@/lib/useHydrated";
import type { User } from "@/types/api";
import { useCartPreviewQuery, useCreateOrderMutation } from "./ordersApi";

// Les mêmes règles que le serveur (createOrderSchema), pour prévenir avant l'envoi.
// Le serveur revérifie tout : le front ne fait que rendre l'erreur plus rapide.
const schema = z.object({
  fullName: z.string().trim().min(3, { error: "Votre nom et prénom (3 caractères au minimum)" }),
  phone: z
    .string()
    .transform((value) => value.replace(/[\s.-]/g, ""))
    .pipe(z.string().regex(/^0[2-7]\d{8}$/, { error: "10 chiffres, par exemple 0555 12 34 56" })),
  wilaya: z.string().min(1, { error: "Choisissez votre wilaya" }),
  commune: z.string().trim().min(2, { error: "Votre commune" }),
  address: z.string().trim().min(5, { error: "L'adresse de livraison (rue, numéro, repère)" }),
  note: z.string().trim().max(500).optional(),
  acceptTerms: z.boolean().refine((value) => value, { error: "Acceptez les conditions générales pour commander" }),
  acceptLimitations: z.boolean(),
});
type Values = z.input<typeof schema>;

export default function CheckoutForm({ user }: { user: User | null }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { items, hydrated: loaded } = useAppSelector((state) => state.cart);
  const hydrated = useHydrated() && loaded;
  const { data: preview, refetch } = useCartPreviewQuery(items, { skip: !hydrated || items.length === 0 });
  const [createOrder, { isLoading, error }] = useCreateOrderMutation();

  // Loi 18-05, art. 12 : aucune case cochée d'avance, aucune wilaya choisie d'avance.
  // Un client connecté retrouve seulement ses propres informations.
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: user ? `${user.firstName} ${user.lastName}` : "",
      phone: user?.phone ?? "",
      wilaya: user?.addressWilaya ?? "",
      commune: user?.addressCommune ?? "",
      address: user?.addressLine ?? "",
      note: "",
      acceptTerms: false,
      acceptLimitations: false,
    },
  });

  if (!hydrated) {
    return <p className="text-ink-muted">Chargement du panier…</p>;
  }
  if (items.length === 0) {
    return (
      <div className="card space-y-4 p-8 text-center">
        <p className="text-lg font-semibold">Votre panier est vide.</p>
        <Link href="/boutique" className="btn btn-primary">
          Aller à la Boutique
        </Link>
      </div>
    );
  }
  if (!preview) {
    return <p className="text-ink-muted">Calcul du récapitulatif…</p>;
  }
  if (!preview.canOrder) {
    return (
      <div role="alert" className="card space-y-4 p-6">
        <p>Votre panier contient un article indisponible ou une quantité trop grande.</p>
        <button type="button" className="btn btn-primary" onClick={() => dispatch(openCart())}>
          Corriger le panier
        </button>
      </div>
    );
  }

  const needsLimitations = preview.limitations.length > 0;

  async function onSubmit(values: Values) {
    if (needsLimitations && !values.acceptLimitations) {
      setError("acceptLimitations", { message: "Acceptez les limitations pour commander ces appareils" });
      return;
    }
    const parsed = schema.parse(values);
    try {
      const order = await createOrder({ ...parsed, items, cartHash: preview!.cartHash }).unwrap();
      try {
        sessionStorage.setItem("dropzone-last-order", JSON.stringify(order));
      } catch {
        // Sans stockage, la confirmation affiche quand même le numéro (dans l'URL).
      }
      dispatch(clearCart());
      router.push(`/commande/confirmation?numero=${order.number}`);
    } catch {
      // Le panier a changé (prix, stock, cadeau) : on recalcule le récapitulatif.
      refetch();
    }
  }

  const fieldProps = (name: keyof Values) => ({
    id: name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="space-y-8">
        <section aria-labelledby="delivery" className="space-y-4">
          <h2 id="delivery" className="text-xl">
            Livraison
          </h2>
          <Field id="fullName" label="Nom et prénom" error={errors.fullName?.message}>
            <input {...register("fullName")} {...fieldProps("fullName")} className="input" autoComplete="name" />
          </Field>
          <Field id="phone" label="Téléphone" error={errors.phone?.message} hint="Le magasin vous appelle pour confirmer.">
            <input {...register("phone")} {...fieldProps("phone")} className="input" type="tel" autoComplete="tel" inputMode="tel" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="wilaya" label="Wilaya" error={errors.wilaya?.message}>
              <select {...register("wilaya")} {...fieldProps("wilaya")} className="input">
                <option value="">Choisir…</option>
                {WILAYAS.map((wilaya, index) => (
                  <option key={wilaya} value={wilaya}>
                    {String(index + 1).padStart(2, "0")} {wilaya}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="commune" label="Commune" error={errors.commune?.message}>
              <input {...register("commune")} {...fieldProps("commune")} className="input" autoComplete="address-level2" />
            </Field>
          </div>
          <Field id="address" label="Adresse" error={errors.address?.message}>
            <input {...register("address")} {...fieldProps("address")} className="input" autoComplete="street-address" />
          </Field>
          <Field id="note" label="Remarque pour le livreur (facultatif)" error={errors.note?.message}>
            <textarea {...register("note")} id="note" className="input min-h-20" rows={3} />
          </Field>
        </section>

        {needsLimitations ? (
          <section aria-labelledby="limits" className="space-y-3 rounded-lg border border-red bg-red-soft p-4">
            <h2 id="limits" className="text-lg text-red">
              Limitations des affaires
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {preview.limitations.map((item) => (
                <li key={item.sku}>
                  <strong>{item.name}</strong> : {item.limitations.join(", ")}
                </li>
              ))}
            </ul>
            <label className="flex items-start gap-3 text-sm font-semibold">
              <input type="checkbox" {...register("acceptLimitations")} className="mt-1 size-5 accent-[var(--red)]" />
              J&apos;ai compris les limitations des affaires de ma commande.
            </label>
            {errors.acceptLimitations ? <p className="field-error">{errors.acceptLimitations.message}</p> : null}
          </section>
        ) : null}
      </div>

      <div className="space-y-4">
        <section aria-labelledby="recap" className="card space-y-3 p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="recap" className="text-xl">
              Récapitulatif
            </h2>
            <button type="button" className="text-sm text-blue-ink underline" onClick={() => dispatch(openCart())}>
              Modifier le panier
            </button>
          </div>
          <ul className="space-y-2 text-sm">
            {preview.lines.map((line) => (
              <li key={line.sku} className="flex justify-between gap-3">
                <span>
                  {line.quantity} × {line.name}
                  <span className="text-ink-muted">
                    {line.isGift
                      ? " (offert)"
                      : ` (${CONDITION_LABELS[line.condition].toLowerCase()}${
                          Object.keys(line.options).length ? `, ${formatOptions(line.options)}` : ""
                        })`}
                  </span>
                </span>
                <span className="whitespace-nowrap">{line.isGift ? "0 DA" : formatPrice(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
        </section>

        <CartSummary preview={preview}>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" {...register("acceptTerms")} className="mt-1 size-5 accent-[var(--blue)]" />
            <span>
              J&apos;ai lu et j&apos;accepte les{" "}
              <Link href="/conditions-generales-de-vente" target="_blank" className="text-blue-ink underline">
                conditions générales de vente
              </Link>
              .
            </span>
          </label>
          {errors.acceptTerms ? <p className="field-error">{errors.acceptTerms.message}</p> : null}
          {error ? (
            <p role="alert" className="field-error">
              {errorMessage(error)}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
            {isLoading ? "Envoi…" : "Confirmer la commande"}
          </button>
        </CartSummary>
      </div>
    </form>
  );
}
