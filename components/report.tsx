"use client";

import { useEffect, useMemo, useState } from "react";
import { CategoryDiscountScatter, SalesBars, ShipDayBars, ShipModeBars, YearBars } from "@/components/report-charts";
import { StateMap } from "@/components/state-map";
import { loadSales, type SalesFile } from "@/lib/csv";
import { money, pct } from "@/lib/format";
import { discountPoints, salesByShipMode, shipDayCounts, summarize } from "@/lib/metrics";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; file: SalesFile };

export function Report() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    loadSales()
      .then((file) => {
        if (!cancelled) setState({ status: "ready", file });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Could not read the sales file.";
        setState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-dvh bg-[#f3f2f1] text-[#252423]">
      <main className="mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-6">
        <header className="mb-5">
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Store Sales</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#605e5c]">
            Store Sales Forecasting · s2014–2017
          </p>
        </header>

        {state.status === "loading" ? (
          <p className="text-sm text-[#605e5c]">Loading sales…</p>
        ) : null}
        {state.status === "error" ? (
          <p className="rounded-md border border-[#f1c0c0] bg-white px-4 py-3 text-sm text-[#9f2d2d]">
            {state.message}
          </p>
        ) : null}
        {state.status === "ready" ? <Dashboard file={state.file} /> : null}
      </main>
    </div>
  );
}

function Dashboard({ file }: { file: SalesFile }) {
  const rows = file.rows;
  const summary = useMemo(() => summarize(rows), [rows]);
  const points = useMemo(() => discountPoints(rows), [rows]);
  const shipModes = useMemo(() => salesByShipMode(rows), [rows]);
  const shipDays = useMemo(() => shipDayCounts(rows), [rows]);
  const empty = rows.length === 0;

  return (
    <div className="space-y-3">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total Sales" value={money(summary.sales)} />
        <Kpi label="Total Profit" value={money(summary.profit)} />
        <Kpi label="Profit Margin" value={pct(summary.margin)} />
        <Kpi label="Average per Order" value={summary.avgQuantity.toFixed(1)} />
      </section>

      {empty ? (
        <p className="rounded-md border border-[#e1dfdd] bg-white px-4 py-8 text-center text-sm text-[#605e5c]">
          No rows in data.csv.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel title="Sales by Region">
            <SalesBars data={summary.regions} />
          </Panel>
          <Panel title="Sales by Year">
            <YearBars data={summary.years} />
          </Panel>
          <Panel title="Sales by Category">
            <SalesBars data={summary.subCategories} labelWidth={108} />
          </Panel>
          <Panel title="Sales by State">
            <StateMap salesByState={summary.salesByState} />
          </Panel>
          <Panel title="Do Discounts Help?" className="lg:col-span-2">
            <p className="mb-2 text-xs text-[#605e5c]">At 30% discounts, most items lose profit.</p>
            {points.length ? <CategoryDiscountScatter data={points} /> : <EmptyChart message="No discount or profit columns in data.csv." />}
          </Panel>
          <Panel title="When Do We Ship?" className="lg:col-span-2">
            <div className="grid gap-3 md:grid-cols-2">
              {shipModes.length ? <ShipModeBars data={shipModes} /> : <EmptyChart message="No ship mode in data.csv." />}
              {shipDays.length ? <ShipDayBars data={shipDays} /> : null}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-2 border-[#605e5c] bg-white px-4 py-3">
      <p className="text-[11px] font-semibold tracking-wide text-[#605e5c] uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}

function Panel({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-md border border-2 border-[#605e5c] bg-white p-4 ${className ?? ""}`}>
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return <p className="px-2 py-8 text-center text-sm text-[#605e5c]">{message}</p>;
}
