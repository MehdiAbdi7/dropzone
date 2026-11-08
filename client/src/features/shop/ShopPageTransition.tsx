"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

export default function ShopPageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = `${pathname}?${searchParams.toString()}`;
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const content = contentRef.current;
    if (!content || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const animation = content.animate(
      [
        { opacity: 0.35, transform: "translateY(18px) scale(0.99)", filter: "blur(4px)" },
        { opacity: 1, transform: "translateY(0) scale(1)", filter: "blur(0)" },
      ],
      { duration: 520, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
    );

    return () => animation.cancel();
  }, [key]);

  return <div ref={contentRef}>{children}</div>;
}
