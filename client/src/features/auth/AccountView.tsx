"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Field from "@/components/ui/Field";
import { STATUS_LABELS } from "@/config/catalog";
import { WILAYAS } from "@/config/wilayas";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatPrice } from "@/lib/format";
import type { User } from "@/types/api";
import { useLogoutMutation, useMeQuery, useMyOrdersQuery, useUpdateMeMutation } from "./authApi";

export default function AccountView() {
  const router = useRouter();
  const { data: user } = useMeQuery();
  const { data: orders } = useMyOrdersQuery();
  const [logout] = useLogoutMutation();

  async function onLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  if (!user) {
    return <p className="text-ink-muted">Chargement du compte…</p>;
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl">Bonjour {user.firstName}</h1>
        <div className="flex gap-2">
          {user.role === "admin" ? (
            <Link href="/admin" className="btn btn-secondary">
              Back-office
            </Link>
          ) : null}
          <button type="button" className="btn btn-secondary" onClick={onLogout}>
            Se déconnecter
          </button>
        </div>
      </header>

      <section aria-labelledby="orders" className="space-y-4">
        <h2 id="orders" className="text-xl">
          Mes commandes
        </h2>
        {!orders ? (
          <p className="text-ink-muted">Chargement…</p>
        ) : orders.length === 0 ? (
          <p className="text-ink-muted">
            Aucune commande pour l&apos;instant.{" "}
            <Link href="/produits" className="text-blue-ink underline">
              Voir les produits
            </Link>
          </p>
        ) : (
          <ul className="card divide-y divide-line">
            {orders.map((order) => (
              <li key={order.number}>
                <Link
                  href={`/compte/commandes/${order.number}`}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-surface-2"
                >
                  <span className="font-display font-bold">n° {order.number}</span>
                  <span className="text-sm text-ink-muted">{formatDate(order.createdAt)}</span>
                  <span className="text-sm">{STATUS_LABELS[order.status]}</span>
                  <span className="font-semibold">{formatPrice(order.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ProfileForm user={user} />
    </div>
  );
}

function ProfileForm({ user }: { user: User }) {
  const [updateMe, { isLoading, error, isSuccess }] = useUpdateMeMutation();
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    addressWilaya: user.addressWilaya ?? "",
    addressCommune: user.addressCommune ?? "",
    addressLine: user.addressLine ?? "",
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    // Une adresse vide devient null : « pas d'adresse par défaut ».
    updateMe({
      ...form,
      addressWilaya: form.addressWilaya || null,
      addressCommune: form.addressCommune || null,
      addressLine: form.addressLine || null,
    });
  }

  const input = (name: keyof typeof form, label: string, autoComplete: string) => (
    <Field id={name} label={label}>
      <input
        id={name}
        className="input"
        autoComplete={autoComplete}
        value={form[name]}
        onChange={(event) => setForm({ ...form, [name]: event.target.value })}
      />
    </Field>
  );

  return (
    <section aria-labelledby="profile" className="space-y-4">
      <h2 id="profile" className="text-xl">
        Mon profil
      </h2>
      <form onSubmit={onSubmit} className="card grid max-w-2xl gap-4 p-5 sm:grid-cols-2">
        {input("firstName", "Prénom", "given-name")}
        {input("lastName", "Nom", "family-name")}
        {input("phone", "Téléphone", "tel")}
        <Field id="addressWilaya" label="Wilaya (adresse par défaut)">
          <select
            id="addressWilaya"
            className="input"
            value={form.addressWilaya}
            onChange={(event) => setForm({ ...form, addressWilaya: event.target.value })}
          >
            <option value="">Aucune</option>
            {WILAYAS.map((wilaya) => (
              <option key={wilaya}>{wilaya}</option>
            ))}
          </select>
        </Field>
        {input("addressCommune", "Commune", "address-level2")}
        {input("addressLine", "Adresse", "street-address")}
        <p className="text-sm text-ink-muted sm:col-span-2">Email : {user.email} (non modifiable)</p>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            Enregistrer
          </button>
          <p aria-live="polite" className="text-sm">
            {error ? <span className="text-red">{errorMessage(error)}</span> : isSuccess ? "Profil enregistré." : null}
          </p>
        </div>
      </form>
    </section>
  );
}
