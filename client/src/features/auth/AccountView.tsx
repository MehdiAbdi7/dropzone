"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import Field from "@/components/ui/Field";
import { LogoutIcon, PackageIcon, UserIcon } from "@/components/ui/icons";
import ProductImage from "@/components/ui/ProductImage";
import { ORDER_TYPE_LABELS, STATUS_LABELS } from "@/config/catalog";
import { WILAYAS } from "@/config/wilayas";
import { orderProgress, profileChanged, type OrderProgress } from "@/features/account/accountView";
import { homeFor, isBackOffice } from "@/features/admin/access";
import { initialsOf } from "@/features/admin/adminIdentity";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatPrice } from "@/lib/format";
import type { OrderSummary, User } from "@/types/api";
import { useLogoutMutation, useMeQuery, useMyOrdersQuery, useUpdateMeMutation } from "./authApi";

// « Mon compte » refait le 23/11 : une carte d'identité en haut, puis deux onglets, « Mes commandes » (des cartes avec
// le premier article, le statut et une mini-frise) et « Mon profil » (deux blocs). Sur ordinateur, les onglets sont un
// menu à gauche ; sur téléphone, deux boutons côte à côte sous la carte d'identité.
// Les cadres sont simples (bordure et ombre légère) : pas la bordure dégradée des cartes de la boutique.
const PANEL = "rounded-2xl border border-line bg-surface shadow-sm";

type Tab = "orders" | "profile";

export default function AccountView() {
  const router = useRouter();
  const { data: user } = useMeQuery();
  const [logout] = useLogoutMutation();
  const [tab, setTab] = useState<Tab>("orders");

  async function onLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  if (!user) {
    return <p className="text-ink-muted">Chargement du compte…</p>;
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <IdentityCard user={user} onLogout={onLogout} />

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <nav aria-label="Mon compte" className="grid grid-cols-2 gap-2 lg:sticky lg:top-24 lg:grid-cols-1">
          <TabButton selected={tab === "orders"} onClick={() => setTab("orders")} icon={<PackageIcon size={18} />}>
            Mes commandes
          </TabButton>
          <TabButton selected={tab === "profile"} onClick={() => setTab("profile")} icon={<UserIcon size={18} />}>
            Mon profil
          </TabButton>
        </nav>

        <div className="min-w-0">{tab === "orders" ? <OrdersTab /> : <ProfileTab user={user} />}</div>
      </div>
    </div>
  );
}

function IdentityCard({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <header className={`${PANEL} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6`}>
      <div className="flex min-w-0 items-center gap-4">
        <span
          aria-hidden="true"
          className="grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue to-red font-display text-lg font-extrabold text-on-brand sm:size-16 sm:text-xl"
        >
          {initialsOf(user.firstName, user.lastName)}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl sm:text-3xl">Bonjour {user.firstName}</h1>
          {/* L'email peut être long : il passe à la ligne au lieu d'élargir la page sur téléphone. */}
          <p className="text-sm break-all text-ink-muted">{user.email}</p>
          {user.phone ? <p className="text-sm text-ink-muted tabular-nums">{user.phone}</p> : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {isBackOffice(user.role) ? (
          <Link href={homeFor(user.role)} className="btn btn-secondary btn-small">
            Back-office
          </Link>
        ) : null}
        <button type="button" className="btn btn-small gap-2 text-ink-muted hover:text-ink" onClick={onLogout}>
          <LogoutIcon size={16} />
          Se déconnecter
        </button>
      </div>
    </header>
  );
}

function TabButton({ selected, onClick, icon, children }: { selected: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 font-display text-sm font-bold whitespace-nowrap transition-colors sm:px-4 lg:justify-start ${
        selected ? "border-blue bg-blue text-on-brand" : "border-line bg-surface text-ink-muted hover:border-ink-muted hover:text-ink"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function OrdersTab() {
  const { data: orders, isError } = useMyOrdersQuery();
  if (isError) return <p role="alert" className="field-error">Vos commandes ne répondent pas, réessayez.</p>;
  if (!orders) return <p className="text-ink-muted">Chargement…</p>;
  if (orders.length === 0) {
    return (
      <div className={`${PANEL} space-y-3 p-6 text-center`}>
        <p className="font-display text-lg font-bold">Aucune commande pour l&apos;instant</p>
        <p className="text-ink-muted">Vos commandes et leur avancement apparaîtront ici.</p>
        <Link href="/boutique" className="btn btn-primary">
          Aller à la Boutique
        </Link>
      </div>
    );
  }
  return (
    <section aria-label="Mes commandes" className="space-y-3">
      <ul className="grid gap-3 xl:grid-cols-2">
        {orders.map((order) => (
          <li key={order.number} className="flex">
            <OrderCard order={order} />
          </li>
        ))}
      </ul>
    </section>
  );
}

const BADGE: Record<OrderProgress["tone"], string> = {
  ongoing: "bg-red-soft text-red",
  done: "bg-blue-soft text-blue-ink",
  stopped: "bg-surface-2 text-ink-muted",
};

function OrderCard({ order }: { order: OrderSummary }) {
  // Une API pas encore déployée ne donne ni le type ni le premier article : la carte reste lisible sans eux.
  const progress = order.type ? orderProgress(order.type, order.status) : null;
  const others = order._count.items - 1;
  // Le badge dit l'étape avec les mots du client : « Encaissée » est un mot du magasin, le client lit « Livrée ».
  const statusText = progress && progress.reached >= 0 ? progress.steps[progress.reached] : STATUS_LABELS[order.status];
  return (
    <Link
      href={`/compte/commandes/${order.number}`}
      className={`${PANEL} flex w-full flex-col gap-4 p-4 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-blue-ink sm:p-5`}
    >
      <div className="flex items-start gap-3">
        <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-surface-2">
          <ProductImage src={order.firstItem?.image ?? null} alt="" sizes="64px" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="font-display font-bold">Commande n° {order.number}</p>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${BADGE[progress?.tone ?? "done"]}`}>{statusText}</span>
          </div>
          {order.firstItem ? (
            <p className="mt-1 line-clamp-2 text-sm">
              {order.firstItem.name}
              {others > 0 ? <span className="text-ink-muted"> + {others} article{others > 1 ? "s" : ""}</span> : null}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-ink-muted">
            {order.type ? `${ORDER_TYPE_LABELS[order.type]} · ` : ""}
            {formatDate(order.createdAt)}
          </p>
        </div>
      </div>

      {progress && progress.steps.length > 0 ? <MiniSteps progress={progress} /> : null}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="font-display text-lg font-bold tabular-nums">{formatPrice(order.total)}</span>
        <span className="text-sm font-semibold text-blue-ink">Voir le détail ›</span>
      </div>
    </Link>
  );
}

// La mini-frise : un trait par étape (bleu fait, rouge en cours, gris à venir, comme au back-office) et le nom de
// l'étape atteinte. Les noms de toutes les étapes ne tiendraient pas sur un téléphone : ils sont lus par le lecteur
// d'écran.
function MiniSteps({ progress }: { progress: OrderProgress }) {
  const { steps, reached } = progress;
  return (
    <div className="space-y-1.5">
      <ol className="flex gap-1.5" aria-label={`Étape ${reached + 1} sur ${steps.length} : ${steps[reached]}`}>
        {steps.map((step, index) => (
          <li
            key={step}
            className={`h-1.5 flex-1 rounded-full ${
              index < reached || progress.tone === "done" ? "bg-blue" : index === reached ? "bg-red" : "bg-surface-2"
            }`}
          >
            <span className="sr-only">{step}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-ink-muted" aria-hidden="true">
        Étape {reached + 1} sur {steps.length} · {steps[reached]}
      </p>
    </div>
  );
}

function ProfileTab({ user }: { user: User }) {
  const [updateMe, { isLoading, error, isSuccess, reset }] = useUpdateMeMutation();
  const saved = {
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    addressWilaya: user.addressWilaya ?? "",
    addressCommune: user.addressCommune ?? "",
    addressLine: user.addressLine ?? "",
  };
  const [form, setForm] = useState(saved);
  const changed = profileChanged(saved, form);

  function set(name: keyof typeof form, value: string) {
    setForm({ ...form, [name]: value });
    // Le message « enregistré » ne doit pas rester affiché pendant qu'on modifie à nouveau.
    if (isSuccess || error) reset();
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!changed) return;
    // Une adresse vide devient null : « pas d'adresse par défaut ».
    updateMe({
      ...form,
      addressWilaya: form.addressWilaya || null,
      addressCommune: form.addressCommune || null,
      addressLine: form.addressLine || null,
    });
  }

  const input = (name: keyof typeof form, label: string, autoComplete: string, inputMode?: "tel") => (
    <Field id={name} label={label}>
      <input
        id={name}
        className="input"
        autoComplete={autoComplete}
        inputMode={inputMode}
        value={form[name]}
        onChange={(event) => set(name, event.target.value)}
      />
    </Field>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-label="Mon profil">
      <ProfileBlock title="Informations personnelles" hint="Le magasin vous appelle à ce numéro pour confirmer vos commandes.">
        {input("firstName", "Prénom", "given-name")}
        {input("lastName", "Nom", "family-name")}
        {input("phone", "Téléphone", "tel", "tel")}
        <Field id="email" label="Email">
          <input id="email" className="input cursor-not-allowed opacity-70" value={user.email} readOnly aria-describedby="email-hint" />
        </Field>
        <p id="email-hint" className="-mt-2 text-xs text-ink-muted sm:col-span-2">
          L&apos;email sert à vous connecter : il ne se modifie pas.
        </p>
      </ProfileBlock>

      <ProfileBlock title="Adresse de livraison par défaut" hint="Elle remplit le formulaire de commande à votre place. Vous pouvez la laisser vide.">
        <Field id="addressWilaya" label="Wilaya">
          <select id="addressWilaya" className="input" value={form.addressWilaya} onChange={(event) => set("addressWilaya", event.target.value)}>
            <option value="">Aucune</option>
            {WILAYAS.map((wilaya) => (
              <option key={wilaya}>{wilaya}</option>
            ))}
          </select>
        </Field>
        {input("addressCommune", "Commune", "address-level2")}
        <div className="sm:col-span-2">{input("addressLine", "Adresse", "street-address")}</div>
      </ProfileBlock>

      {/* Sur téléphone : le message au-dessus, puis Enregistrer et Annuler sur toute la largeur (faciles à toucher avec le
          pouce). Sur ordinateur : le message à gauche, Annuler puis Enregistrer à droite. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <p aria-live="polite" className="text-sm sm:mr-auto">
          {error ? (
            <span className="text-red">{errorMessage(error)}</span>
          ) : isSuccess && !changed ? (
            <span className="font-semibold text-blue-ink">✓ Profil enregistré.</span>
          ) : changed ? (
            <span className="text-ink-muted">Modifications non enregistrées.</span>
          ) : null}
        </p>
        <button type="submit" className="btn btn-primary w-full sm:order-last sm:w-auto" disabled={isLoading || !changed}>
          {isLoading ? "Enregistrement…" : "Enregistrer"}
        </button>
        {changed ? (
          <button type="button" className="btn w-full sm:w-auto" onClick={() => setForm(saved)} disabled={isLoading}>
            Annuler
          </button>
        ) : null}
      </div>
    </form>
  );
}

function ProfileBlock({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <fieldset className={`${PANEL} p-5 sm:p-6`}>
      <legend className="sr-only">{title}</legend>
      <div className="mb-4 space-y-1">
        <h2 className="text-lg" aria-hidden="true">
          {title}
        </h2>
        <p className="text-sm text-ink-muted">{hint}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
