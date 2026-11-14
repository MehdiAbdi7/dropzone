"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import Field from "@/components/ui/Field";
import { CONDITION_LABELS } from "@/config/catalog";
import { clearCart, openCart, setFulfillment } from "@/features/cart/cartSlice";
import CartSummary from "@/features/cart/CartSummary";
import { WILAYAS } from "@/config/wilayas";
import { algiersDate, describePickupDay, pickupDays, pickupSlots } from "@/lib/algiersTime";
import { errorMessage } from "@/lib/errors";
import { formatOptions, formatPrice } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useHydrated } from "@/lib/useHydrated";
import type { User } from "@/types/api";
import { useCartPreview } from "@/features/cart/useCartPreview";
import { checkoutBody } from "./checkoutBody";
import { useCreateOrderMutation, useStoreHoursQuery } from "./ordersApi";

// Les mêmes règles que le serveur (createOrderSchema), pour prévenir avant l'envoi.
// Le serveur revérifie tout : le front ne fait que rendre l'erreur plus rapide.
// Depuis le 14/11, le client choisit la livraison ou le retrait au magasin : l'adresse n'est
// exigée que pour une livraison, le créneau que pour un retrait.
const schema = z
  .object({
    fullName: z.string().trim().min(3, { error: "Votre nom et prénom (3 caractères au minimum)" }),
    phone: z
      .string()
      .transform((value) => value.replace(/[\s.-]/g, ""))
      .pipe(z.string().regex(/^0[2-7]\d{8}$/, { error: "10 chiffres, par exemple 0555 12 34 56" })),
    fulfillment: z.enum(["delivery", "pickup"]),
    wilaya: z.string(),
    commune: z.string().trim(),
    address: z.string().trim(),
    pickupDate: z.string(),
    pickupTime: z.string(),
    note: z.string().trim().max(500).optional(),
    acceptTerms: z.boolean().refine((value) => value, { error: "Acceptez les conditions générales pour commander" }),
    acceptLimitations: z.boolean(),
  })
  .superRefine((values, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (values.fulfillment === "delivery") {
      if (!values.wilaya) issue("wilaya", "Choisissez votre wilaya");
      if (values.commune.length < 2) issue("commune", "Votre commune");
      if (values.address.length < 5) issue("address", "L'adresse de livraison (rue, numéro, repère)");
    } else if (!values.pickupDate) {
      issue("pickupDate", "Choisissez le jour où vous passerez");
    } else if (!values.pickupTime) {
      issue("pickupTime", "Choisissez l'heure à laquelle vous passerez");
    }
  });
type Values = z.input<typeof schema>;

// « Maintenant », relu chaque minute : les créneaux du jour disparaissent au fil des heures.
// Gardé dans un état (et pas relu à chaque rendu) pour que le rendu reste prévisible.
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export default function CheckoutForm({ user }: { user: User | null }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { items, hydrated: loaded } = useAppSelector((state) => state.cart);
  const hydrated = useHydrated() && loaded;
  const [createOrder, { isLoading, error }] = useCreateOrderMutation();
  const { data: hours } = useStoreHoursQuery();
  const now = useNow();

  // Loi 18-05, art. 12 : aucune case cochée d'avance, aucune wilaya choisie d'avance.
  // Un client connecté retrouve seulement ses propres informations.
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: user ? `${user.firstName} ${user.lastName}` : "",
      phone: user?.phone ?? "",
      fulfillment: "delivery",
      wilaya: user?.addressWilaya ?? "",
      commune: user?.addressCommune ?? "",
      address: user?.addressLine ?? "",
      pickupDate: "",
      pickupTime: "",
      note: "",
      acceptTerms: false,
      acceptLimitations: false,
    },
  });
  const fulfillment = useWatch({ control, name: "fulfillment" });
  const chosenDate = useWatch({ control, name: "pickupDate" });

  // `request` : SKU et quantités seulement (les descriptions gardées ne partent pas au serveur).
  // L'aperçu suit le mode de réception : un retrait n'a pas de frais de livraison.
  const { data: preview, refetch, request } = useCartPreview({ skip: !hydrated, fulfillment });

  // La fenêtre du panier, ouverte depuis cette page, calcule dans le même mode que le formulaire ;
  // en quittant la page, elle revient en livraison.
  useEffect(() => {
    dispatch(setFulfillment(fulfillment));
    return () => {
      dispatch(setFulfillment("delivery"));
    };
  }, [dispatch, fulfillment]);

  // Toujours deux jours proposés, nommés (« Samedi », « Dimanche ») : la nuit, après la fermeture,
  // ce sont demain et après-demain, pour qu'on puisse réserver une affaire vue le soir.
  const today = algiersDate(now);
  const days = hours ? pickupDays(hours, now) : [];
  const daySlots = hours && chosenDate ? pickupSlots(hours, chosenDate, now) : [];

  // Le jour choisi n'est plus proposé (rien de choisi encore, ou le magasin vient de fermer et la
  // liste a glissé d'un jour) : on prend le premier jour proposé.
  const daysKey = days.join(",");
  useEffect(() => {
    if (days.length > 0 && !days.includes(chosenDate)) setValue("pickupDate", days[0]);
    // `days` est recalculé à chaque rendu : sa clé texte évite de relancer l'effet pour rien.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysKey, chosenDate, setValue]);
  // Changer de jour efface l'heure choisie : elle n'existe peut-être pas l'autre jour.
  useEffect(() => {
    setValue("pickupTime", "");
  }, [chosenDate, setValue]);

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
    // Le créneau a pu passer depuis l'affichage (le formulaire est resté ouvert) : le serveur le
    // refuserait, on prévient tout de suite.
    if (values.fulfillment === "pickup" && !daySlots.includes(values.pickupTime)) {
      setError("pickupTime", { message: "Ce créneau n'est plus disponible, choisissez-en un autre" });
      return;
    }
    const parsed = schema.parse(values);
    try {
      const order = await createOrder(
        checkoutBody(parsed.fulfillment, parsed, { items: request, cartHash: preview!.cartHash }),
      ).unwrap();
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

  const choiceClass = (checked: boolean, disabled = false) =>
    `flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${
      checked ? "border-blue-ink bg-surface-2" : "border-line"
    } ${disabled ? "cursor-not-allowed opacity-50" : ""}`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="space-y-8">
        <fieldset className="space-y-3">
          <legend className="mb-3 font-display text-xl font-bold">Comment recevoir votre commande ?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={choiceClass(fulfillment === "delivery")}>
              <input type="radio" value="delivery" {...register("fulfillment")} className="mt-1 size-5 accent-[var(--blue)]" />
              <span>
                <span className="block font-semibold">Livraison</span>
                <span className="text-sm text-ink-muted">Payée à la réception.</span>
              </span>
            </label>
            <label className={choiceClass(fulfillment === "pickup")}>
              <input type="radio" value="pickup" {...register("fulfillment")} className="mt-1 size-5 accent-[var(--blue)]" />
              <span>
                <span className="block font-semibold">Retrait au magasin</span>
                <span className="text-sm text-ink-muted">Sans frais, payé au magasin.</span>
              </span>
            </label>
          </div>
        </fieldset>

        <section aria-labelledby="contact" className="space-y-4">
          <h2 id="contact" className="text-xl">
            {fulfillment === "delivery" ? "Livraison" : "Vos coordonnées"}
          </h2>
          <Field id="fullName" label="Nom et prénom" error={errors.fullName?.message}>
            <input {...register("fullName")} {...fieldProps("fullName")} className="input" autoComplete="name" />
          </Field>
          <Field
            id="phone"
            label="Téléphone"
            error={errors.phone?.message}
            hint={fulfillment === "delivery" ? "Le magasin vous appelle pour confirmer." : "Pour vous prévenir si besoin."}
          >
            <input {...register("phone")} {...fieldProps("phone")} className="input" type="tel" autoComplete="tel" inputMode="tel" />
          </Field>

          {fulfillment === "delivery" ? (
            <>
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
            </>
          ) : (
            <div className="space-y-4">
              {!hours ? (
                <p className="text-sm text-ink-muted">Chargement des horaires du magasin…</p>
              ) : days.length === 0 ? (
                <p className="text-sm text-ink-muted">Le retrait au magasin n&apos;est pas disponible pour le moment.</p>
              ) : (
                <>
                  <fieldset>
                    <legend className="mb-2 text-sm font-semibold">Quel jour passez-vous ?</legend>
                    <div className="grid grid-cols-2 gap-3">
                      {days.map((day) => {
                        const label = describePickupDay(day, today);
                        return (
                          <label key={day} className={choiceClass(chosenDate === day, false)}>
                            <input
                              type="radio"
                              value={day}
                              {...register("pickupDate")}
                              className="mt-1 size-5 accent-[var(--blue)]"
                            />
                            <span>
                              <span className="block font-semibold">{label.weekday}</span>
                              <span className="text-sm text-ink-muted">
                                {label.relative ? `${label.relative} · ${label.date}` : label.date}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                  <Field id="pickupTime" label="À quelle heure ?" error={errors.pickupTime?.message}>
                    <select {...register("pickupTime")} {...fieldProps("pickupTime")} className="input">
                      <option value="">Choisir…</option>
                      {daySlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot.replace(":", "h")}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <p className="rounded-lg border border-line bg-surface-2 p-3 text-sm">
                    Votre appareil est réservé jusqu&apos;à minuit le jour choisi. Vous le payez au magasin.
                  </p>
                </>
              )}
            </div>
          )}

          <Field
            id="note"
            label={fulfillment === "delivery" ? "Remarque pour le livreur (facultatif)" : "Remarque pour le magasin (facultatif)"}
            error={errors.note?.message}
          >
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

        <CartSummary preview={preview} fulfillment={fulfillment}>
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
            {isLoading ? "Envoi…" : fulfillment === "delivery" ? "Confirmer la commande" : "Réserver mon appareil"}
          </button>
        </CartSummary>
      </div>
    </form>
  );
}
