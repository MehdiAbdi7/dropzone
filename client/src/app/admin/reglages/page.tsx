"use client";

import { useState, type FormEvent } from "react";
import { useReservationSettingsQuery, useSaveReservationSettingsMutation, useSaveStoreHoursMutation, type ReservationSettings } from "@/features/admin/api/storeApi";
import { useAdminRole } from "@/features/admin/AdminRoleContext";
import EditDialog from "@/features/admin/products/EditDialog";
import InvoiceSettingsSection from "@/features/admin/invoice/InvoiceSettingsForm";
import { useStoreHoursQuery } from "@/features/orders/ordersApi";
import type { StoreHours } from "@/lib/algiersTime";
import { errorMessage } from "@/lib/errors";

// Les réglages du magasin (14/11) : pour l'instant, les horaires. Ils décident des créneaux de
// retrait proposés aux clients (toutes les 30 minutes, de l'ouverture à la fermeture).

// Les heures proposées : de 06h00 à 23h30, toutes les demi-heures.
const TIMES = Array.from({ length: 36 }, (_, index) => {
  const minutes = 6 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${minutes % 60 === 0 ? "00" : "30"}`;
});
// Dans l'ordre de la semaine algérienne ; la valeur est celle de Date.getUTCDay (0 = dimanche).
const DAYS: [number, string][] = [
  [6, "Samedi"],
  [0, "Dimanche"],
  [1, "Lundi"],
  [2, "Mardi"],
  [3, "Mercredi"],
  [4, "Jeudi"],
  [5, "Vendredi"],
];

export default function SettingsPage() {
  const { data, isError } = useStoreHoursQuery();
  // Chaque réglage est derrière un bouton, dans sa fenêtre (refonte du 18/11).
  const [open, setOpen] = useState<"hours" | "invoice" | "reservation" | null>(null);
  // L'avance et le numéro BaridiMob : l'admin seul (l'API refuse les autres rôles).
  const isAdmin = useAdminRole() === "admin";
  const reservation = useReservationSettingsQuery(undefined, { skip: !isAdmin });
  const close = () => setOpen(null);
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl sm:text-3xl">Réglages</h1>
      {isError ? <p role="alert">Les réglages ne répondent pas.</p> : null}
      {!data && !isError ? <p className="text-ink-muted">Chargement…</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <SettingButton
          title="Horaires du magasin"
          text="Ouverture, fermeture et jours fermés : les créneaux de réservation en dépendent."
          disabled={!data}
          onClick={() => setOpen("hours")}
        />
        {isAdmin ? (
          <SettingButton
            title="Réservation illimitée"
            text="L'avance BaridiMob demandée au client et le numéro sur lequel il l'envoie."
            disabled={!reservation.data}
            onClick={() => setOpen("reservation")}
          />
        ) : null}
        <SettingButton
          title="Facture"
          text="Raison sociale, RC, NIF, adresse et garantie imprimés sur la facture."
          onClick={() => setOpen("invoice")}
        />
      </div>
      {/* Monté une fois les horaires lus : il part des valeurs enregistrées, puis garde les
          siennes (après un enregistrement, ce sont les mêmes que celles de l'API). */}
      <EditDialog open={open === "hours"} title="Horaires du magasin" size="sm" onClose={close}>
        {data ? <HoursForm initial={data} /> : null}
      </EditDialog>
      {isAdmin ? (
        <EditDialog open={open === "reservation"} title="Réservation illimitée" size="sm" onClose={close}>
          {reservation.data ? <ReservationForm initial={reservation.data} onDone={close} /> : null}
        </EditDialog>
      ) : null}
      {/* Ce qui s'imprime sur la facture (lot 6). */}
      <EditDialog open={open === "invoice"} title="Facture" onClose={close}>
        <InvoiceSettingsSection />
      </EditDialog>
    </div>
  );
}

function SettingButton({ title, text, disabled, onClick }: { title: string; text: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="card space-y-1 p-5 text-left transition-[border-color] enabled:hover:border-blue-ink disabled:opacity-50"
    >
      <span className="block font-display text-lg font-bold">{title}</span>
      <span className="block text-sm text-ink-muted">{text}</span>
    </button>
  );
}

function HoursForm({ initial }: { initial: StoreHours }) {
  const [hours, setHours] = useState(initial);
  const [save, { isLoading, error, isSuccess }] = useSaveStoreHoursMutation();
  const toggleDay = (day: number) =>
    setHours((current) => ({
      ...current,
      closedDays: current.closedDays.includes(day) ? current.closedDays.filter((d) => d !== day) : [...current.closedDays, day],
    }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save(hours);
  };

  return (
    <form onSubmit={submit} className="card space-y-5 p-5">
      <div>
        <h2 className="text-lg">Horaires du magasin</h2>
        <p className="text-sm text-ink-muted">
          Les clients qui choisissent la réservation au magasin peuvent réserver un créneau entre l&apos;ouverture et la fermeture,
          toutes les 30 minutes, hors jours de fermeture.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {(["openingTime", "closingTime"] as const).map((field) => (
          <label key={field} className="space-y-1 text-sm font-semibold">
            <span className="block">{field === "openingTime" ? "Ouverture" : "Fermeture"}</span>
            <select
              className="input"
              value={hours[field]}
              onChange={(event) => setHours({ ...hours, [field]: event.target.value })}
            >
              {TIMES.map((time) => (
                <option key={time} value={time}>
                  {time.replace(":", "h")}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Jours de fermeture</legend>
        <div className="flex flex-wrap gap-3">
          {DAYS.map(([day, label]) => (
            <label key={day} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-5 accent-[var(--blue)]"
                checked={hours.closedDays.includes(day)}
                onChange={() => toggleDay(day)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      {isSuccess ? (
        <p role="status" className="text-sm font-semibold">
          Horaires enregistrés.
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={isLoading}>
        Enregistrer
      </button>
    </form>
  );
}

// L'avance et le numéro BaridiMob de la réservation illimitée (18/11). Avance à 0 ou numéro vide : l'offre est
// coupée, le formulaire de commande ne la propose pas. Le numéro n'est jamais public : le client le reçoit dans
// le suivi de sa commande quand le magasin clique « Envoyer le numéro BaridiMob ».
function ReservationForm({ initial, onDone }: { initial: ReservationSettings; onDone: () => void }) {
  const [advance, setAdvance] = useState(initial.advance > 0 ? String(initial.advance) : "");
  const [number, setNumber] = useState(initial.baridiNumber);
  const [save, { isLoading, error }] = useSaveReservationSettingsMutation();
  const amount = advance.trim() === "" ? 0 : Number(advance);
  const active = amount > 0 && number.trim() !== "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await save({ advance: amount, baridiNumber: number.trim() }).unwrap();
      onDone();
    } catch {
      // L'erreur RTK Query est affichée sous le formulaire ; rien n'est fermé.
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <p className="text-sm text-ink-muted">
        Le client qui choisit « Réservation illimitée » garde l&apos;appareil sans date limite contre cette avance, qu&apos;il envoie par BaridiMob
        après votre appel. L&apos;avance est déduite du prix à son passage.
      </p>
      <label className="block text-sm font-semibold">
        <span className="label">Avance demandée (DA)</span>
        <input className="input" inputMode="numeric" value={advance} onChange={(event) => setAdvance(event.target.value.replace(/\D/g, ""))} />
      </label>
      <label className="block text-sm font-semibold">
        <span className="label">Numéro BaridiMob (RIP)</span>
        <input className="input font-mono" value={number} maxLength={40} onChange={(event) => setNumber(event.target.value)} />
      </label>
      <p className="text-sm font-semibold" aria-live="polite">
        {active ? "L'offre est proposée aux clients." : "L'offre n'est pas proposée : il faut une avance et un numéro."}
      </p>
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={isLoading}>
        Enregistrer
      </button>
    </form>
  );
}
