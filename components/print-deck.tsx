"use client";

import { useEffect } from "react";
import { DeckNavProvider } from "@/components/deck-nav";
import { SLIDES } from "@/components/slides";

export function PrintDeck() {
  useEffect(() => {
    let cancel = false;
    const mark = async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      await new Promise((resolve) => setTimeout(resolve, 700));
      if (!cancel) document.documentElement.dataset.printReady = "true";
    };
    void mark();
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <DeckNavProvider go={() => {}}>
      <div className="bg-[#f3efe6] text-foreground">
        {SLIDES.map((slide, index) => {
          const Content = slide.Content;
          return (
            <section
              key={slide.id}
              data-slide={slide.id}
              data-label={slide.label}
              className="relative mx-auto flex w-[1200px] min-h-[675px] flex-col justify-center bg-[#f3efe6] px-8 pt-8 pb-12"
            >
              <Content />
              <p className="absolute right-8 bottom-4 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                {slide.label} · {index + 1} / {SLIDES.length}
              </p>
            </section>
          );
        })}
      </div>
    </DeckNavProvider>
  );
}
