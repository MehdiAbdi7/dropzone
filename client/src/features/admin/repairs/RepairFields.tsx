"use client";

import type { ReactNode } from "react";

// Un nombre vide reste vide (null) : on ne l'envoie jamais comme 0. `NaN` : le texte n'est pas un nombre.
export const toLabor = (text: string): number | null => (text.trim() === "" ? null : Number(text));
export const digitsOnly = (text: string) => text.replace(/\D/g, "");

// Un petit bouton qui ouvre une fenêtre, avec une pastille : verte quand la fenêtre est remplie, rouge sinon
// (le même geste que le comptoir de la vente).
export function WindowButton({ onClick, done, children }: { onClick: () => void; done: boolean; children: ReactNode }) {
  return (
    <button type="button" className="btn btn-secondary btn-small gap-2" onClick={onClick}>
      <span aria-hidden="true" className={`inline-block size-2.5 rounded-full ${done ? "bg-emerald-500" : "bg-red"}`} />
      {children}
      <span className="sr-only">{done ? " (rempli)" : " (à remplir)"}</span>
    </button>
  );
}

// Les champs de l'appareil, partagés par la création et la modification d'une fiche.
export type DeviceFields = { deviceName: string; deviceColor: string; deviceState: string; issue: string; accessories: string };

export function DeviceInputs({ value, onChange }: { value: DeviceFields; onChange: (next: DeviceFields) => void }) {
  const set = (patch: Partial<DeviceFields>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold">
        <span className="label">Appareil</span>
        <input className="input" autoComplete="off" maxLength={80} placeholder="iPhone 13" value={value.deviceName} onChange={(event) => set({ deviceName: event.target.value })} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          <span className="label">Couleur (facultatif)</span>
          <input className="input" autoComplete="off" maxLength={300} value={value.deviceColor} onChange={(event) => set({ deviceColor: event.target.value })} />
        </label>
        <label className="block text-sm font-semibold">
          <span className="label">État à l&apos;arrivée (facultatif)</span>
          <input className="input" autoComplete="off" maxLength={300} placeholder="Rayures, écran fissuré…" value={value.deviceState} onChange={(event) => set({ deviceState: event.target.value })} />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        <span className="label">Panne décrite par le client</span>
        <textarea className="input min-h-20" maxLength={500} value={value.issue} onChange={(event) => set({ issue: event.target.value })} />
      </label>
      <label className="block text-sm font-semibold">
        <span className="label">Accessoires laissés (facultatif)</span>
        <input className="input" autoComplete="off" maxLength={300} placeholder="Coque, chargeur…" value={value.accessories} onChange={(event) => set({ accessories: event.target.value })} />
      </label>
      <p className="text-xs text-ink-muted">Ne notez jamais le code de déverrouillage du client : la fiche ne le garde pas.</p>
    </div>
  );
}

export type ClientFields = { fullName: string; phone: string };

export function ClientInputs({ value, onChange }: { value: ClientFields; onChange: (next: ClientFields) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-semibold">
        <span className="label">Nom et prénom du client</span>
        <input className="input" autoComplete="off" maxLength={80} value={value.fullName} onChange={(event) => onChange({ ...value, fullName: event.target.value })} />
      </label>
      <label className="block text-sm font-semibold">
        <span className="label">Téléphone du client</span>
        <input className="input" inputMode="tel" autoComplete="off" value={value.phone} onChange={(event) => onChange({ ...value, phone: event.target.value })} />
      </label>
    </div>
  );
}

export function LaborInput({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  return (
    <label className="block text-sm font-semibold">
      <span className="label">Main-d&apos;œuvre (DA)</span>
      <input className="input w-48" inputMode="numeric" value={value} placeholder="À fixer plus tard" onChange={(event) => onChange(digitsOnly(event.target.value))} />
    </label>
  );
}
