"use client";

import { Suspense, useState } from "react";
import { useAdminRole } from "@/features/admin/AdminRoleContext";
import { useRepairCountsQuery, useRepairsQuery } from "@/features/admin/api/repairsApi";
import RepairCreateForm from "@/features/admin/repairs/RepairCreateForm";
import RepairWindow from "@/features/admin/repairs/RepairWindow";
import RepairsTable from "@/features/admin/repairs/RepairsTable";
import RepairsTabs, { type RepairsTab } from "@/features/admin/repairs/RepairsTabs";
import { parseRepairSearch, repairCapabilities } from "@/features/admin/repairs/repairsView";
import { useRepairWindow } from "@/features/admin/repairs/useRepairWindow";
import { errorMessage } from "@/lib/errors";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

// Les réparations de l'atelier (18/11, étape 2) : les appareils confiés au magasin, de « Reçu » à « Rendu ».
// Depuis le 21/11, deux onglets comme les commandes (Nouvelles, En cours) à la place d'une pastille par étape ; un
// clic sur une fiche ouvre sa fenêtre, qui s'ouvre sur l'étape où en est l'appareil. Les fiches rendues sont dans
// l'Historique.
export default function RepairsPage() {
  return (
    <Suspense>
      <RepairsList />
    </Suspense>
  );
}

function RepairsList() {
  const [tab, setTab] = useState<RepairsTab>("new");
  const [text, setText] = useState("");
  const [creating, setCreating] = useState(false);
  const caps = repairCapabilities(useAdminRole());
  const repairWindow = useRepairWindow();
  // La recherche attend une pause dans la saisie : chaque touche relancerait la requête.
  const search = useDebouncedValue(parseRepairSearch(text));
  const { data, error, isFetching } = useRepairsQuery({ stage: tab, q: search }, { pollingInterval: 30_000 });
  const { data: counts } = useRepairCountsQuery(undefined, { pollingInterval: 30_000 });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl">Réparations</h1>
          <p className="text-ink-muted">Les appareils confiés au magasin, de leur arrivée à leur retour au client.</p>
        </div>
        {caps.createsRepair ? (
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            Nouvelle réparation
          </button>
        ) : null}
      </div>

      <RepairsTabs tab={tab} onChange={setTab} newCount={counts?.new} ongoingCount={counts?.ongoing} />

      <label className="block max-w-md">
        <span className="sr-only">Chercher une réparation</span>
        <input
          className="input"
          type="search"
          autoComplete="off"
          maxLength={60}
          placeholder="Numéro (R-1001), nom ou téléphone…"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>

      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : (
        <RepairsTable
          repairs={data}
          busy={isFetching}
          showMoney={caps.seesClientMoney}
          empty={search ? "Aucune réparation ne correspond à cette recherche." : tab === "new" ? "Aucun appareil à regarder pour l'instant." : "Aucune réparation en cours."}
          onOpen={repairWindow.open}
        />
      )}

      <RepairCreateForm
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          setCreating(false);
          repairWindow.open(id);
        }}
      />
      <RepairWindow id={repairWindow.id} onClose={repairWindow.close} />
    </div>
  );
}
