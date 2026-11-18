"use client";

import { useState, type FormEvent } from "react";
import { useCreateRepairMutation, useWarrantySearchQuery, type WarrantyHit } from "@/features/admin/api/repairsApi";
import EditDialog from "@/features/admin/products/EditDialog";
import ShopPicker from "@/features/admin/sales/ShopPicker";
import type { VariantHit } from "@/features/admin/sales/ticket";
import { errorMessage } from "@/lib/errors";
import { ClientInputs, DeviceInputs, LaborInput, WindowButton, toLabor, type ClientFields, type DeviceFields } from "./RepairFields";
import { repairDraftProblem, warrantyLabel } from "./repairsView";

const dayMonthYear = (day: string) => day.split("-").reverse().join("/");

// « Nouvelle réparation » : on la crée au comptoir comme une vente, avec des boutons qui ouvrent des fenêtres
// (Appareil, Client, Garantie, Prix). Les pièces se choisissent dans la fiche, juste après la création.
export default function RepairCreateForm({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  return (
    <EditDialog open={open} title="Nouvelle réparation" onClose={onClose} closeLabel="Annuler">
      <CreateBody onCreated={onCreated} />
    </EditDialog>
  );
}

const EMPTY_DEVICE: DeviceFields = { deviceName: "", deviceColor: "", deviceState: "", issue: "", accessories: "" };

// Monté seulement fenêtre ouverte (EditDialog) : le brouillon repart à zéro à chaque ouverture.
function CreateBody({ onCreated }: { onCreated: (id: number) => void }) {
  const [window, setWindow] = useState<"device" | "client" | "warranty" | "price" | null>(null);
  const [device, setDevice] = useState<DeviceFields>(EMPTY_DEVICE);
  const [client, setClient] = useState<ClientFields>({ fullName: "", phone: "" });
  const [labor, setLabor] = useState("");
  const [origin, setOrigin] = useState<WarrantyHit | null>(null);
  const [forceOut, setForceOut] = useState(false);
  const [create, { isLoading, error }] = useCreateRepairMutation();
  const close = () => setWindow(null);

  const laborPrice = toLabor(labor);
  const problem = repairDraftProblem({ ...client, deviceName: device.deviceName, issue: device.issue, laborPrice });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem) return;
    try {
      const repair = await create({
        ...client,
        deviceName: device.deviceName,
        deviceColor: device.deviceColor,
        deviceState: device.deviceState,
        issue: device.issue,
        accessories: device.accessories,
        ...(laborPrice !== null ? { laborPrice } : {}),
        ...(origin ? { originItemId: origin.itemId, forceOutOfWarranty: forceOut } : {}),
      }).unwrap();
      onCreated(repair.id);
    } catch {
      // L'erreur RTK Query est affichée sous le bouton ; la fiche reste telle quelle.
    }
  }

  const deviceDone = device.deviceName.trim().length >= 2 && device.issue.trim().length >= 3;
  const clientDone = client.fullName.trim().length >= 3 && client.phone.trim() !== "";

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="flex flex-wrap gap-2">
        <WindowButton onClick={() => setWindow("device")} done={deviceDone}>
          Appareil
        </WindowButton>
        <WindowButton onClick={() => setWindow("client")} done={clientDone}>
          Formulaire client
        </WindowButton>
        <WindowButton onClick={() => setWindow("warranty")} done={origin !== null}>
          Garantie
        </WindowButton>
        <WindowButton onClick={() => setWindow("price")} done={laborPrice !== null}>
          Prix
        </WindowButton>
      </div>

      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[10rem_1fr]">
        <dt className="font-semibold">Appareil</dt>
        <dd>{device.deviceName || <span className="text-ink-muted">À remplir</span>}</dd>
        <dt className="font-semibold">Panne</dt>
        <dd>{device.issue || <span className="text-ink-muted">À remplir</span>}</dd>
        <dt className="font-semibold">Client</dt>
        <dd>{clientDone ? `${client.fullName} · ${client.phone}` : <span className="text-ink-muted">À remplir</span>}</dd>
        <dt className="font-semibold">Garantie</dt>
        <dd>
          {origin ? (
            <>
              {origin.name} (commande {origin.orderNumber}) ·{" "}
              {forceOut ? "Hors garantie (forcée)" : warrantyLabel({ underWarranty: origin.underWarranty, warrantyEndsAt: origin.warrantyEndsAt, warrantyForcedOff: false })}
            </>
          ) : (
            "Hors garantie : acheté ailleurs ou commande non retrouvée"
          )}
        </dd>
        <dt className="font-semibold">Main-d&apos;œuvre</dt>
        <dd>{laborPrice === null ? <span className="text-ink-muted">À fixer plus tard</span> : `${laborPrice} DA`}</dd>
      </dl>

      {problem ? <p className="text-sm text-ink-muted">{problem}</p> : null}
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={isLoading || problem !== null}>
        {isLoading ? "Création…" : "Créer la fiche"}
      </button>

      <EditDialog open={window === "device"} title="Appareil" size="sm" onClose={close}>
        <div className="space-y-4">
          <PickFromCatalogue onPick={(hit) => setDevice((current) => ({ ...current, deviceName: hit.productName, deviceColor: colorOf(hit) || current.deviceColor }))} />
          <DeviceInputs value={device} onChange={setDevice} />
        </div>
      </EditDialog>
      <EditDialog open={window === "client"} title="Formulaire client" size="sm" onClose={close}>
        <ClientInputs value={client} onChange={setClient} />
      </EditDialog>
      <EditDialog open={window === "warranty"} title="Garantie" size="sm" onClose={close}>
        <WarrantyWindow
          defaultPhone={client.phone}
          origin={origin}
          forceOut={forceOut}
          onPick={(hit) => {
            setOrigin(hit);
            if (!hit) setForceOut(false);
          }}
          onForceOut={setForceOut}
        />
      </EditDialog>
      <EditDialog open={window === "price"} title="Prix" size="sm" onClose={close}>
        <div className="space-y-3">
          <LaborInput value={labor} onChange={setLabor} />
          <p className="text-sm text-ink-muted">
            Peut rester vide tant que le technicien n&apos;a pas regardé la panne. Les pièces se choisissent dans la fiche, une fois créée.
          </p>
        </div>
      </EditDialog>
    </form>
  );
}

// La couleur d'un appareil choisi dans le catalogue : l'option « Couleur » de sa variante.
const colorOf = (hit: VariantHit) => Object.entries(hit.options).find(([key]) => /couleur/i.test(key))?.[1] ?? "";

// Remplir le nom de l'appareil depuis le catalogue (la même recherche que la vente). Le texte libre reste possible.
function PickFromCatalogue({ onPick }: { onPick: (hit: VariantHit) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" className="btn btn-secondary btn-small" onClick={() => setOpen(true)}>
        Chercher dans le catalogue
      </button>
      <EditDialog
        open={open}
        title="Appareil du catalogue"
        onClose={() => setOpen(false)}
      >
        <ShopPicker
          onPick={(hit) => {
            onPick(hit);
            setOpen(false);
          }}
        />
      </EditDialog>
    </div>
  );
}

// Retrouver la vente d'origine : par le téléphone du client ou le numéro de la commande. Le serveur calcule la
// garantie ; ici on choisit l'article, ou on garde « hors garantie ».
function WarrantyWindow({
  defaultPhone,
  origin,
  forceOut,
  onPick,
  onForceOut,
}: {
  defaultPhone: string;
  origin: WarrantyHit | null;
  forceOut: boolean;
  onPick: (hit: WarrantyHit | null) => void;
  onForceOut: (value: boolean) => void;
}) {
  const [phone, setPhone] = useState(defaultPhone);
  const [order, setOrder] = useState("");
  const [asked, setAsked] = useState<{ phone?: string; order?: string } | null>(null);
  const { data, isFetching, error } = useWarrantySearchQuery(asked ?? {}, { skip: asked === null });

  function search() {
    const query = { ...(phone.trim() ? { phone: phone.trim() } : {}), ...(order.trim() ? { order: order.trim() } : {}) };
    setAsked(Object.keys(query).length ? query : null);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          <span className="label">Téléphone de l&apos;acheteur</span>
          <input className="input" inputMode="tel" autoComplete="off" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </label>
        <label className="block text-sm font-semibold">
          <span className="label">ou numéro de commande</span>
          <input className="input" inputMode="numeric" autoComplete="off" value={order} onChange={(event) => setOrder(event.target.value.replace(/\D/g, ""))} />
        </label>
      </div>
      <button type="button" className="btn btn-primary btn-small" onClick={search} disabled={isFetching}>
        {isFetching ? "Recherche…" : "Chercher la vente"}
      </button>
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      {data && data.length === 0 ? <p className="text-sm text-ink-muted">Aucune vente retrouvée : l&apos;appareil sera hors garantie.</p> : null}
      <ul className="space-y-2">
        {data?.map((hit) => (
          <li key={hit.itemId}>
            <button
              type="button"
              aria-pressed={origin?.itemId === hit.itemId}
              onClick={() => onPick(origin?.itemId === hit.itemId ? null : hit)}
              className={`card w-full p-3 text-left ${origin?.itemId === hit.itemId ? "outline outline-2 outline-blue" : ""}`}
            >
              <span className="block font-semibold">{hit.name}</span>
              <span className="block text-sm text-ink-muted">
                Vendu le {dayMonthYear(hit.soldOn)} (commande {hit.orderNumber}) ·{" "}
                {hit.underWarranty ? `sous garantie jusqu'au ${dayMonthYear(hit.warrantyEndsAt)}` : `garantie finie le ${dayMonthYear(hit.warrantyEndsAt)}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {origin ? (
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={forceOut} onChange={(event) => onForceOut(event.target.checked)} />
          Forcer « hors garantie » (appareil tombé dans l&apos;eau, cassé par le client…)
        </label>
      ) : null}
    </div>
  );
}
