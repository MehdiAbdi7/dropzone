"use client";

import { useState, type FormEvent } from "react";
import { useSaveStoreHoursMutation } from "@/features/admin/api/storeApi";
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
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl">Réglages</h1>
      {isError ? <p role="alert">Les réglages ne répondent pas.</p> : null}
      {!data && !isError ? <p className="text-ink-muted">Chargement…</p> : null}
      {/* `key` : le formulaire repart des valeurs enregistrées quand elles changent. */}
      {data ? <HoursForm key={JSON.stringify(data)} initial={data} /> : null}
    </div>
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
          Les clients qui choisissent le retrait au magasin peuvent réserver un créneau entre l&apos;ouverture et la fermeture,
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
