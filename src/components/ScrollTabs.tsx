import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

interface ScrollTabsProps {
  /** Rotulo acessivel da lista de abas */
  label: string;
  /** Muda quando a aba ativa muda: rola a aba ativa para a area visivel */
  activeKey?: string;
  children: ReactNode;
}

/**
 * Faixa de abas com rolagem horizontal. As setas aparecem só quando existe conteúdo
 * escondido daquele lado: no início não há seta à esquerda, no fim não há seta à direita.
 */
export function ScrollTabs({ label, activeKey, children }: ScrollTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    // Tolerancia de 1px: zoom e telas de alta densidade geram scrollLeft fracionado
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const observer = new ResizeObserver(updateArrows);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));
    return () => {
      el.removeEventListener("scroll", updateArrows);
      observer.disconnect();
    };
  }, [updateArrows, children]);

  // Aba ativa sempre visivel (ex.: entrou direto por um link com ?stage=delivered)
  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    active?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [activeKey]);

  function scrollBy(direction: -1 | 1) {
    const el = listRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.7, 120), behavior: "smooth" });
  }

  return (
    <div className="scroll-tabs">
      {canScrollLeft && (
        <button
          type="button"
          className="scroll-tabs__arrow scroll-tabs__arrow--left"
          aria-label="Ver abas anteriores"
          onClick={() => scrollBy(-1)}
        >
          <Chevron direction="left" />
        </button>
      )}
      <div ref={listRef} className="tabs" role="tablist" aria-label={label}>
        {children}
      </div>
      {canScrollRight && (
        <button
          type="button"
          className="scroll-tabs__arrow scroll-tabs__arrow--right"
          aria-label="Ver mais abas"
          onClick={() => scrollBy(1)}
        >
          <Chevron direction="right" />
        </button>
      )}
    </div>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
