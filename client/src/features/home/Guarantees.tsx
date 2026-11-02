import type { ReactNode } from "react";

export type Guarantee = { icon: ReactNode; title: string; text: string };

// Une rangée de garanties : une icône dans une pastille, un titre, une ligne.
// Deux colonnes sur mobile (icône au-dessus), quatre en ligne sur grand écran.
export default function Guarantees({ items }: { items: Guarantee[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4 lg:gap-0">
      {items.map((item) => (
        <li
          key={item.title}
          className="flex flex-col gap-3 sm:flex-row sm:items-center lg:px-5 lg:first:pl-0 lg:not-first:border-l lg:not-first:border-line"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-soft text-blue-ink">
            {item.icon}
          </span>
          <div>
            <p className="font-display text-sm font-bold">{item.title}</p>
            <p className="mt-0.5 text-sm text-ink-muted">{item.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
