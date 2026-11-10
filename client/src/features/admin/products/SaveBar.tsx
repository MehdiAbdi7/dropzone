import { errorMessage, fieldErrors } from "@/lib/errors";
import type { ProductStatus } from "@/types/api";
import { WARRANTY_MAX } from "./productDraft";

// La barre du bas du formulaire : ce qui bloque l'envoi, l'erreur de l'API, le statut et le bouton.
export default function SaveBar({
  missingOrigins,
  missingBoxes,
  badWarranties,
  error,
  status,
  onStatusChange,
  isLoading,
  canSubmit,
  submitLabel,
}: {
  // Les SKU des variantes à corriger avant l'envoi (trois contrôles faits par le formulaire).
  missingOrigins: string[];
  missingBoxes: string[];
  badWarranties: string[];
  error: unknown;
  status: ProductStatus;
  onStatusChange: (status: ProductStatus) => void;
  isLoading: boolean;
  canSubmit: boolean;
  submitLabel: string;
}) {
  const serverErrors = Object.entries(fieldErrors(error));

  return (
    <div className="card sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 space-y-3 p-4 lg:bottom-0">
      <div aria-live="polite" className="text-sm">
        {missingOrigins.length > 0 || missingBoxes.length > 0 || badWarranties.length > 0 ? (
          <>
            {missingOrigins.length > 0 ? (
              <p className="font-semibold text-red">
                Dites si chaque pièce changée est d&apos;origine ou compatible : {missingOrigins.join(", ")}.
              </p>
            ) : null}
            {missingBoxes.length > 0 ? (
              <p className="font-semibold text-red">Choisissez la boîte de : {missingBoxes.join(", ")}.</p>
            ) : null}
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="sr-only">Statut du produit</legend>
          <span className="mr-1 text-sm font-semibold">Statut :</span>
          {(["draft", "published"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className="chip"
              aria-pressed={status === option}
              onClick={() => onStatusChange(option)}
            >
              {option === "draft" ? "Brouillon" : "Publié"}
            </button>
          ))}
        </fieldset>
        <button type="submit" className="btn btn-primary" disabled={isLoading || !canSubmit}>
          {isLoading ? "Enregistrement…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
