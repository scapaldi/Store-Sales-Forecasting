"use client";

import { createContext, useContext } from "react";

const DeckNavContext = createContext<(index: number) => void>(() => {});

export function DeckNavProvider({
  go,
  children,
}: {
  go: (index: number) => void;
  children: React.ReactNode;
}) {
  return <DeckNavContext.Provider value={go}>{children}</DeckNavContext.Provider>;
}

export function useDeckNav() {
  return useContext(DeckNavContext);
}
