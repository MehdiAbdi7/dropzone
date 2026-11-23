import type { ReactNode } from "react";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { WARRANTY_MAX } from "./productDraft";

// Ce qui bloque l'envoi (trois contrôles faits par le formulaire), sinon l'erreur de l'API.
function Problems({
  missingOrigins,
  missingBoxes,
  badWarranties,
  error,
}: {
  missingOrigins: string[];
  missingBoxes: string[];
  badWarranties: string[];
  error: unknown;
}) {
  const serverErrors = Object.entries(fieldErrors(error));
  return (
    <div aria-live="polite" className="text-sm">
      {missingOrigins.length > 0 || missingBoxes.length > 0 || badWarranties.length > 0 ? (
        <>
          {missingOrigins.length > 0 ? (
            <p className="font-semibold text-red">
              Dites si chaque pièce changée est d&apos;origine ou compatible : {missingOrigins.join(", ")}.
            </p>
          ) : null}
          {missingBoxes.length > 0 ? <p className="font-semibold text-red">Choisissez la boîte de : {missingBoxes.join(", ")}.</p> : null}
          {badWarranties.length > 0 ? (
            <p className="font-semibold text-red">
              La garantie va de 1 à {WARRANTY_MAX} mois : {badWarranties.join(", ")}.
            </p>
          ) : null}
        </>
      ) : error ? (
        <div className="text-red">
          <p className="font-semibold">{errorMessage(error)}</p>
          {serverErrors.length > 0 ? (
            <ul className="list-disc pl-5">
              {serverErrors.map(([field, messages]) => (
                <li key={field}>
                  {field} : {messages.join(", ")}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type ProblemProps = { missingOrigins: string[]; missingBoxes: string[]; badWarranties: string[]; error: unknown };

// La barre du bas de la création d'un produit : ce qui bloque l'envoi et « Créer le produit ». Le produit est toujours
// visible depuis le 23/11 (le brouillon se règle sur chaque variante) : plus de choix Brouillon / Publié ici.
export default function SaveBar({
  isLoading,
  canSubmit,
  submitLabel,
  ...problems
}: ProblemProps & { isLoading: boolean; canSubmit: boolean; submitLabel: string }) {
  return (
    <div className="card sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 space-y-3 p-4 lg:bottom-0">
      <Problems {...problems} />
      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={isLoading || !canSubmit}>
          {isLoading ? "Enregistrement…" : submitLabel}
        </button>
      </div>
    </div>
  );
}

// Le pied d'une fenêtre d'un produit existant (23/11) : chaque fenêtre s'enregistre seule. « Annuler » remet ce que
// l'API a reçu ; « Enregistrer » ne s'allume que si quelque chose a changé. `children` : ce qui va au-dessus des boutons
// (le statut d'une variante, la confirmation d'un retrait).
export function WindowFooter({
  isLoading,
  canSave,
  onCancel,
  onSave,
  children,
  ...problems
}: ProblemProps & { isLoading: boolean; canSave: boolean; onCancel: () => void; onSave: () => void; children?: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 -mb-4 space-y-3 border-t border-line bg-surface p-4 sm:-mx-5 sm:-mb-5 sm:px-5">
      {children}
      <Problems {...problems} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn w-full sm:w-auto" onClick={onCancel} disabled={isLoading}>
          Annuler
        </button>
        <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={onSave} disabled={isLoading || !canSave}>
          {isLoading ? "Enregistrement…" : canSave ? "Enregistrer" : "Rien à enregistrer"}
        </button>
      </div>
    </div>
  );
}
