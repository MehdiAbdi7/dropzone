"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

type Snapshot = {
  content: HTMLElement;
  top: number;
  left: number;
  width: number;
};

export default function ShopPageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const contentRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const previousPathRef = useRef(pathname);
  const snapshotRef = useRef<Snapshot | null>(null);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) {
      return;
    }

    function saveCurrentPage() {
      const current = contentRef.current;
      if (!current) {
        return;
      }

      const page = current.closest("main") ?? current;
      const bounds = page.getBoundingClientRect();
      const clone = page.cloneNode(true) as HTMLElement;
      clone.setAttribute("aria-hidden", "true");
      clone.inert = true;
      clone.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
      snapshotRef.current = { content: clone, top: bounds.top, left: bounds.left, width: bounds.width };
    }

    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) {
        return;
      }

      const destination = new URL(link.href, window.location.href);
      if (destination.origin === window.location.origin && destination.pathname !== window.location.pathname) {
        saveCurrentPage();
      }
    }

    function onSubmit() {
      saveCurrentPage();
    }

    function onPopState() {
      saveCurrentPage();
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useLayoutEffect(() => {
    if (previousPathRef.current === pathname) {
      return;
    }
    previousPathRef.current = pathname;

    const content = contentRef.current;
    const layer = layerRef.current;
    const snapshot = snapshotRef.current;
    snapshotRef.current = null;
    if (!content || !layer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      layer?.replaceChildren();
      return;
    }

    if (snapshot) {
      Object.assign(snapshot.content.style, {
        position: "absolute",
        top: `${snapshot.top}px`,
        left: `${snapshot.left}px`,
        width: `${snapshot.width}px`,
        margin: "0",
      });
      layer.replaceChildren(snapshot.content);

      const exitAnimation = snapshot.content.animate(
        [
          { opacity: 1, transform: "translateX(0)" },
          { opacity: 0, transform: "translateX(-48px)" },
        ],
        { duration: 420, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" },
      );
      exitAnimation.onfinish = () => layer.replaceChildren();
    }

    const enterAnimation = content.animate(
      [
        { opacity: 0, transform: "translateX(36px)" },
        { opacity: 1, transform: "translateX(0)" },
      ],
      {
        duration: 620,
        delay: snapshot ? 420 : 0,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "backwards",
      },
    );

    return () => {
      enterAnimation.cancel();
      layer.replaceChildren();
    };
  }, [pathname]);

  return (
    <>
      <div ref={layerRef} className="shop-transition-layer" aria-hidden="true" />
      <div ref={contentRef}>{children}</div>
    </>
  );
}
