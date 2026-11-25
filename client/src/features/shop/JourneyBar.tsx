"use client";

import Link from "next/link";
import { type CSSProperties, type KeyboardEvent, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRightIcon, CheckIcon, ChevronDownIcon, CloseIcon, RouteIcon } from "@/components/ui/icons";
import { type JourneyStep, type JourneyStepKey, journeyBackHref, journeyProgress, journeyTitle } from "./journey";
import JourneyChoiceList, { type JourneyContext, type StaticChoices } from "./JourneyChoiceList";
import { useListDismiss } from "./useListDismiss";

// Le parcours d'achat des pages d'un appareil (25/11, demande de Mehdi), à la place du fil d'Ariane :
// où en est le client, ce qu'il a choisi, ce qui reste, et de quoi revenir à une étape en un geste.
// Les deux affichages sont dans la page, le CSS n'en montre qu'un (1024 px, `lg`) : rien ne se mesure
// pendant le rendu.
// - Ordinateur : les étapes sur une ligne. Une étape faite est un bouton qui ouvre la liste des autres
//   choix de cette étape (changer de marque sans repasser par les pages d'avant).
// - Téléphone : bouton retour, « Étape N sur M », une icône de frise et la barre de progression, qui
//   ouvrent la feuille « Ton parcours » avec toutes les étapes.

function StepDot({ step, number }: { step: JourneyStep; number: number }) {
  return <span className="journey-dot">{step.status === "done" ? <CheckIcon size={14} /> : number}</span>;
}

function StepText({ step }: { step: JourneyStep }) {
  return (
    <span className="journey-text">
      <span className="journey-k">{step.label}</span>
      {step.value ? <span className="journey-v">{step.value}</span> : null}
    </span>
  );
}

// Une étape faite, sur ordinateur : son bouton et la liste qui s'ouvre dessous.
function StepMenu({
  step,
  number,
  context,
  staticChoices,
}: {
  step: JourneyStep;
  number: number;
  context: JourneyContext;
  staticChoices: StaticChoices;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { onKeyDown } = useListDismiss({ open, popover: true, rootRef, triggerRef, listRef, setOpen });

  return (
    <div ref={rootRef} className="journey-menu" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
        className="journey-step"
        data-status="done"
      >
        <StepDot step={step} number={number} />
        <StepText step={step} />
        <ChevronDownIcon size={14} className="journey-chevron" />
      </button>
      {open ? (
        <div className="filter-pop journey-pop">
          <p className="journey-head">Changer de {step.label.toLowerCase()}</p>
          <JourneyChoiceList
            step={step}
            context={context}
            staticChoices={staticChoices}
            listRef={listRef}
            onNavigate={() => setOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function JourneyBar({
  steps,
  current,
  context,
  staticChoices,
}: {
  steps: JourneyStep[];
  current: JourneyStepKey | "end";
  context: JourneyContext;
  staticChoices: StaticChoices;
}) {
  const [sheet, setSheet] = useState(false);
  const [expanded, setExpanded] = useState<JourneyStepKey | null>(null);
  const routeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const progress = journeyProgress(steps);
  const back = journeyBackHref(steps);
  // L'étape où mène le retour : celle d'avant, ou la dernière sur la fiche finale.
  const currentIndex = steps.findIndex((step) => step.status === "current");
  const backStep = currentIndex === -1 ? steps.at(-1) : steps[currentIndex - 1];

  function closeSheet() {
    setSheet(false);
    setExpanded(null);
    routeRef.current?.focus();
  }

  function onSheetKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeSheet();
    }
  }

  return (
    <nav aria-label="Parcours d'achat" className="journey">
      <div className="journey-row">
        {back ? (
          <Link href={back} className="journey-back" aria-label={`Retour : ${backStep?.label ?? "page précédente"}`}>
            <ArrowRightIcon size={18} className="rotate-180" />
          </Link>
        ) : null}

        <ol className="journey-steps">
          {steps.map((step, index) => (
            <li key={step.key} className="journey-item" data-status={step.status}>
              {step.status === "done" ? (
                <StepMenu step={step} number={index + 1} context={context} staticChoices={staticChoices} />
              ) : (
                <div className="journey-step" data-status={step.status} aria-current={step.status === "current" ? "step" : undefined}>
                  <StepDot step={step} number={index + 1} />
                  <StepText step={step} />
                </div>
              )}
            </li>
          ))}
        </ol>

        <div className="journey-info">
          <p className="journey-kicker">{progress.kicker}</p>
          <p className="journey-title">{journeyTitle(current)}</p>
        </div>
        <button ref={routeRef} type="button" aria-label="Voir tout le parcours" onClick={() => setSheet(true)} className="journey-route">
          <RouteIcon size={20} />
        </button>
      </div>

      <button
        type="button"
        aria-label="Voir tout le parcours"
        onClick={() => setSheet(true)}
        className="journey-bars"
        style={{ "--journey-steps": steps.length } as CSSProperties}
      >
        {steps.map((step) => (
          <span key={step.key} data-status={step.status} />
        ))}
      </button>

      {sheet
        ? createPortal(
            <div className="picker-layer" onKeyDown={onSheetKeyDown}>
              <button type="button" aria-label="Fermer le parcours" tabIndex={-1} onClick={closeSheet} className="picker-backdrop" />
              <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="picker-panel is-themed">
                <div className="picker-head">
                  <h2 id={titleId} className="text-base font-extrabold">
                    Ton parcours
                  </h2>
                  <button type="button" aria-label="Fermer" onClick={closeSheet} className="icon-btn" autoFocus>
                    <CloseIcon size={18} />
                  </button>
                </div>
                <ol className="picker-list journey-timeline">
                  {steps.map((step, index) => (
                    <li key={step.key} data-status={step.status}>
                      <StepDot step={step} number={index + 1} />
                      {step.status === "done" ? (
                        <button
                          type="button"
                          aria-expanded={expanded === step.key}
                          onClick={() => setExpanded(expanded === step.key ? null : step.key)}
                          className="journey-row-button"
                        >
                          <StepText step={step} />
                          <span className="journey-change">{expanded === step.key ? "Fermer" : "Changer"}</span>
                        </button>
                      ) : (
                        <div className="journey-row-button" aria-current={step.status === "current" ? "step" : undefined}>
                          <StepText step={step} />
                          {step.status === "current" ? <span className="journey-now">en cours</span> : null}
                        </div>
                      )}
                      {expanded === step.key ? (
                        <div className="journey-alts">
                          <JourneyChoiceList step={step} context={context} staticChoices={staticChoices} onNavigate={closeSheet} />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            </div>,
            document.body,
          )
        : null}
    </nav>
  );
}
