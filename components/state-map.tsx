"use client";

import { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { assetPath } from "@/lib/csv";
import { money } from "@/lib/format";

const EMPTY = "#f3f2f1";
const LOW = "#d6e6f8";
const HIGH = "#0b4f9c";

type Tip = { name: string; sales: number; x: number; y: number };

export function StateMap({ salesByState }: { salesByState: Map<string, number> }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(0, ...salesByState.values());

  return (
    <div className="relative">
      <ComposableMap
        projection="geoAlbersUsa"
        width={800}
        height={500}
        className="h-auto w-full"
      >
        <Geographies geography={assetPath("states-10m.json")}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const name = String(geo.properties?.name ?? "");
              const sales = salesByState.get(name) ?? 0;
              const base = sales > 0 ? mix(LOW, HIGH, Math.sqrt(sales / max)) : EMPTY;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={hover === geo.rsmKey ? (sales > 0 ? "#118DFF" : "#e1dfdd") : base}
                  stroke="#ffffff"
                  strokeWidth={0.6}
                  onMouseEnter={(event) => {
                    setHover(geo.rsmKey);
                    setTip({ name, sales, x: event.clientX, y: event.clientY });
                  }}
                  onMouseMove={(event) => {
                    setTip((current) =>
                      current ? { ...current, x: event.clientX, y: event.clientY } : current,
                    );
                  }}
                  onMouseLeave={() => {
                    setHover(null);
                    setTip(null);
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      <div className="mt-1 flex items-center gap-3 text-[11px] text-[#605e5c]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm border border-[#e1dfdd]" style={{ background: EMPTY }} />
          No sales
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-16 rounded-sm"
            style={{ background: `linear-gradient(to right, ${LOW}, ${HIGH})` }}
          />
          Lower to higher sales
        </span>
      </div>
      {tip ? (
        <div
          className="pointer-events-none fixed z-20 rounded border border-[#e1dfdd] bg-white px-3 py-2 text-xs leading-5 text-[#252423] shadow-md"
          style={{ left: tip.x + 12, top: tip.y + 12 }}
        >
          <p className="font-semibold">{tip.name}</p>
          <p>Sales {money(tip.sales)}</p>
        </div>
      ) : null}
    </div>
  );
}

function mix(from: string, to: string, t: number): string {
  const a = hex(from);
  const b = hex(to);
  const amount = Math.min(1, Math.max(0, t));
  const channel = (index: number) => Math.round(a[index] + (b[index] - a[index]) * amount);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

function hex(value: string): [number, number, number] {
  const raw = value.replace("#", "");
  return [
    Number.parseInt(raw.slice(0, 2), 16),
    Number.parseInt(raw.slice(2, 4), 16),
    Number.parseInt(raw.slice(4, 6), 16),
  ];
}
