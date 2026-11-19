"use client";

import { useEffect } from "react";
import { WILAYAS } from "@/config/wilayas";
import { canAccess } from "@/features/admin/access";
import { useAdminRole } from "@/features/admin/AdminRoleContext";
import { useReservationOfferQuery, useStoreHoursQuery } from "@/features/orders/ordersApi";
import { algiersDate, describePickupDay, pickupDays, pickupSlots } from "@/lib/algiersTime";
import { formatPrice } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import { unlimitedReservationNote, type PhoneOrderDraft } from "./phoneOrder";

// Un nombre vide reste vide (NaN) : les frais laissés vides sont calculés par le serveur.
const toNumber = (text: string) => (text.trim() === "" ? Number.NaN : Number(text));

type Props = {
  draft: PhoneOrderDraft;
  onChange: (changes: Partial<PhoneOrderDraft>) => void;
  // Les frais que le serveur calculerait pour ce panier (aperçu), null tant qu'on ne les connaît pas.
  estimatedFee: number | null;
};

// Le contenu des fenêtres « Livraison » et « Réservation » de la commande prise par téléphone (19/11). Les
// jours et les créneaux sont ceux du site (mêmes fonctions, mêmes horaires) : le serveur les revérifie.
export default function PhoneOrderForm({ draft, onChange, estimatedFee }: Props) {
  return draft.fulfillment === "delivery" ? (
    <DeliveryFields draft={draft} onChange={onChange} estimatedFee={estimatedFee} />
  ) : (
    <ReservationFields draft={draft} onChange={onChange} />
  );
}

function DeliveryFields({ draft, onChange, estimatedFee }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          <span className="label">Wilaya</span>
          <select className="input" value={draft.wilaya} onChange={(event) => onChange({ wilaya: event.target.value })}>
            <option value="">Choisir…</option>
            {WILAYAS.map((wilaya, index) => (
              <option key={wilaya} value={wilaya}>
                {String(index + 1).padStart(2, "0")} {wilaya}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          <span className="label">Commune</span>
          <input className="input" autoComplete="off" value={draft.commune} onChange={(event) => onChange({ commune: event.target.value })} />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        <span className="label">Adresse</span>
        <input className="input" autoComplete="off" value={draft.address} onChange={(event) => onChange({ address: event.target.value })} />
      </label>
      <label className="block text-sm font-semibold">
        <span className="label">Frais de livraison (DA), facultatif</span>
        <input
          className="input w-40"
          inputMode="numeric"
          autoComplete="off"
          value={Number.isNaN(draft.shippingFee) ? "" : draft.shippingFee}
          onChange={(event) => onChange({ shippingFee: toNumber(event.target.value.replace(/\D/g, "")) })}
        />
        <span className="mt-1 block text-sm font-normal text-ink-muted">
          {estimatedFee === null
            ? "Laissez vide : les frais sont calculés comme sur le site."
            : `Laissez vide : calculés comme sur le site, ${formatPrice(estimatedFee)} pour ce panier.`}
        </span>
      </label>
    </div>
  );
}

function ReservationFields({ draft, onChange }: Pick<Props, "draft" | "onChange">) {
  const { data: hours } = useStoreHoursQuery();
  const { data: offer } = useReservationOfferQuery();
  const unlimitedAdvance = offer?.unlimitedAdvance ?? null;
  const role = useAdminRole();
  const now = useNow();
  const today = algiersDate(now);
  const days = hours ? pickupDays(hours, now) : [];
  const slots = hours && draft.pickupDate ? pickupSlots(hours, draft.pickupDate, now) : [];

  // Le jour choisi n'est plus proposé (rien de choisi encore, ou le magasin vient de fermer) : on prend le premier.
  const daysKey = days.join(",");
  useEffect(() => {
    if (draft.reservationMode === "two_days" && days.length > 0 && !days.includes(draft.pickupDate)) {
      onChange({ pickupDate: days[0], pickupTime: "" });
    }
    // `days` change seulement avec `daysKey` ; `onChange` est recréé à chaque rendu de la page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysKey, draft.reservationMode, draft.pickupDate]);

  // Une illimitée choisie alors que le magasin vient de couper l'offre : retour à deux jours.
  useEffect(() => {
    if (offer && unlimitedAdvance === null && draft.reservationMode === "unlimited") onChange({ reservationMode: "two_days" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer, unlimitedAdvance, draft.reservationMode]);

  return (
    <div className="space-y-4">
      {unlimitedAdvance !== null ? (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Comment réserver ?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <ModeChoice checked={draft.reservationMode === "two_days"} onSelect={() => onChange({ reservationMode: "two_days" })} title="Réservation de 2 jours">
              Sans avance : le client passe le jour choisi.
            </ModeChoice>
            <ModeChoice checked={draft.reservationMode === "unlimited"} onSelect={() => onChange({ reservationMode: "unlimited" })} title="Réservation illimitée">
              Avance BaridiMob de {formatPrice(unlimitedAdvance)}, sans date limite.
            </ModeChoice>
          </div>
        </fieldset>
      ) : null}

      {draft.reservationMode === "unlimited" ? (
        <p className="rounded-lg border border-line bg-surface-2 p-3 text-sm">
          {unlimitedReservationNote(canAccess(role, "/admin/commandes"), unlimitedAdvance ?? 0)}
        </p>
      ) : !hours ? (
        <p className="text-sm text-ink-muted">Chargement des horaires du magasin…</p>
      ) : days.length === 0 ? (
        <p role="alert" className="field-error">
          Aucun jour proposé : vérifiez les horaires du magasin dans les réglages.
        </p>
      ) : (
        <>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Quel jour le client passe-t-il ?</legend>
            <div className="grid grid-cols-2 gap-3">
              {days.map((day) => {
                const label = describePickupDay(day, today);
                return (
                  <ModeChoice
                    key={day}
                    checked={draft.pickupDate === day}
                    onSelect={() => onChange({ pickupDate: day, pickupTime: "" })}
                    title={label.weekday}
                  >
                    {label.relative ? `${label.relative} · ${label.date}` : label.date}
                  </ModeChoice>
                );
              })}
            </div>
          </fieldset>
          <label className="block text-sm font-semibold">
            <span className="label">À quelle heure ?</span>
            <select className="input w-40" value={draft.pickupTime} onChange={(event) => onChange({ pickupTime: event.target.value })}>
              <option value="">Choisir…</option>
              {slots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot.replace(":", "h")}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
    </div>
  );
}

// Un choix en carte : une case ronde, un titre, une précision.
function ModeChoice({ checked, onSelect, title, children }: { checked: boolean; onSelect: () => void; title: string; children: React.ReactNode }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${checked ? "border-blue-ink bg-surface-2" : "border-line"}`}>
      <input type="radio" checked={checked} onChange={onSelect} className="mt-1 size-5 accent-[var(--blue)]" />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="text-sm text-ink-muted">{children}</span>
      </span>
    </label>
  );
}
