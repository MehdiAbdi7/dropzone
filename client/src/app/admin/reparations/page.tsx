"use client";

import { Suspense, useState } from "react";
import { useRepairCountsQuery, useRepairsQuery, type RepairStage } from "@/features/admin/api/repairsApi";
import RepairCreateForm from "@/features/admin/repairs/RepairCreateForm";
import RepairWindow from "@/features/admin/repairs/RepairWindow";
import RepairsTable from "@/features/admin/repairs/RepairsTable";
import { REPAIR_STATUS_LABELS, parseRepairSearch } from "@/features/admin/repairs/repairsView";
import { useRepairWindow } from "@/features/admin/repairs/useRepairWindow";
import { errorMessage } from "@/lib/errors";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

// Les réparations de l'atelier (18/11, étape 2) : les appareils confiés au magasin, de « Reçu » à « Rendu ».
// Une chip par étape avec son nombre ; un clic sur une fiche ouvre sa fenêtre (frise, pièces, bon de dépôt).
export default function RepairsPage() {
  return (
    <Suspense>
      <RepairsList />
    </Suspense>
  );
}

const STAGES: { stage: RepairStage; label: string }[] = [
  { stage: "open", label: "En cours" },
  { stage: "received", label: REPAIR_STATUS_LABELS.received },
  { stage: "quote", label: REPAIR_STATUS_LABELS.quote },
  { stage: "in_repair", label: REPAIR_STATUS_LABELS.in_repair },
  { stage: "ready", label: REPAIR_STATUS_LABELS.ready },
  { stage: "to_return", label: "À rendre" },
  { stage: "returned", label: REPAIR_STATUS_LABELS.returned },
];

function RepairsList() {
  const [stage, setStage] = useState<RepairStage>("open");
  const [text, setText] = useState("");
  const [creating, setCreating] = useState(false);
  const repairWindow = useRepairWindow();
  // La recherche attend une pause dans la saisie : chaque touche relancerait la requête.
  const search = useDebouncedValue(parseRepairSearch(text));
  const { data, error, isFetching } = useRepairsQuery({ stage, q: search }, { pollingInterval: 30_000 });
  const { data: counts } = useRepairCountsQuery(undefined, { pollingInterval: 30_000 });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl">Réparations</h1>
          <p className="text-ink-muted">Les appareils confiés au magasin, de leur arrivée à leur retour au client.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          Nouvelle réparation
        </button>
      </div>

      <div role="group" aria-label="Étape des réparations" className="flex flex-wrap gap-2">
        {STAGES.map((item) => (
          <button key={item.stage} type="button" className="chip" aria-pressed={stage === item.stage} onClick={() => setStage(item.stage)}>
            {item.label}
            {counts ? <span className="ml-2 text-xs text-ink-muted">{counts[item.stage]}</span> : null}
          </button>
        ))}
      </div>

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
          empty={search ? "Aucune réparation ne correspond à cette recherche." : "Aucune réparation à cette étape."}
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
