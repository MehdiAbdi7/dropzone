"use client";

import { useState, type FormEvent } from "react";
import { useInvoiceSettingsQuery, useSaveInvoiceSettingsMutation, type InvoiceSettings } from "@/features/admin/api/invoiceApi";
import { errorMessage } from "@/lib/errors";

// Réglages › Facture (lot 6) : ce qui s'imprime en tête et en bas de chaque facture. Un champ laissé vide
// n'apparaît pas. Les identifiants légaux (RC, NIF, NIS…) sont à remplir avec les vrais, et la facture est à
// faire vérifier par le comptable de DropZone avant tout usage réel (le statut du magasin n'est pas connu).
const TEXT_FIELDS: { key: keyof InvoiceSettings; label: string; hint?: string }[] = [
  { key: "shopName", label: "Nom du magasin" },
  { key: "legalForm", label: "Forme juridique", hint: "Par exemple SARL, EURL, entreprise individuelle." },
  { key: "address", label: "Adresse" },
  { key: "phones", label: "Téléphones" },
  { key: "email", label: "Email" },
  { key: "instagram", label: "Instagram" },
  { key: "registerNumber", label: "Registre du commerce (RC)" },
  { key: "nif", label: "NIF" },
  { key: "nis", label: "NIS" },
  { key: "taxArticle", label: "Article d'imposition" },
  { key: "rib", label: "RIB", hint: "Pour les paiements par virement ou CCP." },
];

export default function InvoiceSettingsSection() {
  const { data, isError } = useInvoiceSettingsQuery();
  if (isError) return <p role="alert">Les réglages de la facture ne répondent pas.</p>;
  if (!data) return <p className="text-ink-muted">Chargement…</p>;
  // Monté une fois les réglages lus : le formulaire part des valeurs enregistrées, puis garde les siennes.
  return <InvoiceSettingsForm initial={data} />;
}

function InvoiceSettingsForm({ initial }: { initial: InvoiceSettings }) {
  const [values, setValues] = useState(initial);
  const [save, { isLoading, error, isSuccess }] = useSaveInvoiceSettingsMutation();
  const set = (patch: Partial<InvoiceSettings>) => setValues((current) => ({ ...current, ...patch }));
  const vatInvalid = !Number.isInteger(values.vatRate) || values.vatRate < 0 || values.vatRate > 100;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!vatInvalid && values.shopName.trim()) save(values);
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-5" aria-label="Réglages de la facture">
      <div>
        <h2 className="text-lg">Facture</h2>
        <p className="text-sm text-ink-muted">
          Ce qui s&apos;imprime en tête et en bas de chaque facture. Un champ vide n&apos;apparaît pas. À faire vérifier par le
          comptable avant l&apos;usage réel.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {TEXT_FIELDS.map((field) => (
          <label key={field.key} className="block space-y-1 text-sm font-semibold">
            <span className="block">{field.label}</span>
            <input
              className="input"
              value={String(values[field.key])}
              onChange={(event) => set({ [field.key]: event.target.value })}
            />
            {field.hint ? <span className="block text-xs font-normal text-ink-muted">{field.hint}</span> : null}
          </label>
        ))}
      </div>
      <label className="block space-y-1 text-sm font-semibold">
        <span className="block">Conditions de garantie et de retour</span>
        <textarea
          className="input min-h-28"
          maxLength={1500}
          value={values.warrantyTerms}
          onChange={(event) => set({ warrantyTerms: event.target.value })}
        />
      </label>
      <label className="block space-y-1 text-sm font-semibold">
        <span className="block">Note de bas de page</span>
        <input className="input" maxLength={300} value={values.footerNote} onChange={(event) => set({ footerNote: event.target.value })} />
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">TVA</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-5 accent-[var(--blue)]"
            checked={values.vatEnabled}
            onChange={(event) => set({ vatEnabled: event.target.checked })}
          />
          Afficher la TVA sur la facture (éteinte tant que le statut du magasin n&apos;est pas connu)
        </label>
        {values.vatEnabled ? (
          <label className="block text-sm font-semibold">
            <span className="label">Taux de TVA (%)</span>
            <input
              className="input w-28"
              inputMode="numeric"
              value={Number.isNaN(values.vatRate) ? "" : values.vatRate}
              onChange={(event) => set({ vatRate: event.target.value.trim() === "" ? Number.NaN : Number(event.target.value.replace(/\D/g, "")) })}
            />
          </label>
        ) : null}
        {vatInvalid && values.vatEnabled ? (
          <p role="alert" className="field-error">
            Un taux entier, de 0 à 100.
          </p>
        ) : null}
      </fieldset>
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      {isSuccess ? (
        <p role="status" className="text-sm font-semibold">
          Réglages de la facture enregistrés.
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={isLoading || (values.vatEnabled && vatInvalid) || !values.shopName.trim()}>
        Enregistrer
      </button>
    </form>
  );
}
