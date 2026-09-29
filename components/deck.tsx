"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { DeckNavProvider } from "@/components/deck-nav";
import { SLIDES } from "@/components/slides";

export function Deck() {
  const [index, setIndex] = useState(0);

  const go = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, next));
    setIndex(clamped);
    const id = SLIDES[clamped].id;
    window.history.replaceState(null, "", `#${id}`);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        go(index + 1);
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        go(index - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        go(0);
      } else if (event.key === "End") {
        event.preventDefault();
        go(SLIDES.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  const slide = SLIDES[index];
  const Content = slide.Content;

  return (
    <DeckNavProvider go={go}>
      <div className="flex h-dvh flex-col bg-background">
        <div className="h-1 bg-muted" aria-hidden>
          <div
            className="h-full bg-sales transition-[width] duration-300"
            style={{ width: `${((index + 1) / SLIDES.length) * 100}%` }}
          />
        </div>
        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-56 shrink-0 flex-col border-r border-border md:flex">
            <div className="px-4 pt-5 pb-3">
              <p className="font-serif text-lg leading-tight">Global Superstore</p>
              <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                2016–2019
              </p>
            </div>
            <nav aria-label="Slides" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4">
              {SLIDES.map((item, itemIndex) => (
                <Button
                  key={item.id}
                  type="button"
                  variant={itemIndex === index ? "secondary" : "ghost"}
                  className="h-auto w-full justify-start gap-2 px-2 py-2 text-left whitespace-normal"
                  aria-current={itemIndex === index ? "true" : undefined}
                  onClick={() => go(itemIndex)}
                >
                  <span className="w-5 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {String(itemIndex + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm leading-5">{item.label}</span>
                </Button>
              ))}
            </nav>
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex gap-2 overflow-x-auto border-b border-border px-3 py-2 md:hidden">
              {SLIDES.map((item, itemIndex) => (
                <Button
                  key={item.id}
                  type="button"
                  size="sm"
                  variant={itemIndex === index ? "secondary" : "ghost"}
                  className="shrink-0"
                  onClick={() => go(itemIndex)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8" aria-live="polite">
              <Content />
            </main>
            <footer className="flex items-center justify-between gap-3 border-t border-border px-3 py-3 md:px-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => go(index - 1)}
                disabled={index === 0}
              >
                <ChevronLeft />
                Previous
              </Button>
              <div className="flex items-center gap-3">
                <p className="text-center text-xs text-muted-foreground tabular-nums">
                  <span className="hidden sm:inline">Arrow keys · </span>
                  {index + 1} / {SLIDES.length}
                </p>
                <a
                  href="/global-superstore-2016-2019.pdf"
                  download="Global Superstore 2016-2019.pdf"
                  className={buttonVariants({ variant: "outline" })}
                >
                  <Download />
                  <span className="hidden sm:inline">Download</span>
                </a>
              </div>
              <Button type="button" onClick={() => go(index + 1)} disabled={index === SLIDES.length - 1}>
                Next
                <ChevronRight />
              </Button>
            </footer>
          </div>
        </div>
      </div>
    </DeckNavProvider>
  );
}
