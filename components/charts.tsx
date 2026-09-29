"use client";

import { useSyncExternalStore } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  Bar,
  BarChart,
} from "recharts";
import superstore from "@/lib/superstore.json";
import { axisMoney, money, pct } from "@/lib/format";

const CATEGORY_COLOR: Record<string, string> = {
  Furniture: "#8c3a2f",
  "Office Supplies": "#0e6b66",
  Technology: "#1f4b82",
};

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ChartFrame({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ready = useIsClient();
  return (
    <div className={className}>
      {ready ? children : <div className="h-full w-full rounded-xl bg-card" />}
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs leading-5 shadow-md">
      {children}
    </div>
  );
}

export function GrowthChart() {
  return (
    <ChartFrame className="h-64 w-full md:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={superstore.monthly}
          margin={{ top: 16, right: 12, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke="#e4d9c4" vertical={false} />
          <XAxis
            dataKey="month"
            ticks={["2016-01", "2017-01", "2018-01", "2019-01"]}
            tickFormatter={(value: string) => value.slice(0, 4)}
            tick={{ fill: "#6b6458", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="sales"
            tickFormatter={axisMoney}
            tick={{ fill: "#6b6458", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <YAxis
            yAxisId="profit"
            orientation="right"
            tickFormatter={axisMoney}
            tick={{ fill: "#6b6458", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as (typeof superstore.monthly)[number];
              return (
                <Tip>
                  <p className="font-medium">{point.label}</p>
                  <p>Sales {money(point.sales)}</p>
                  <p>Profit {money(point.profit)}</p>
                  <p>Margin {pct(point.profit / point.sales)}</p>
                  <p>{point.orders.toLocaleString("en-US")} orders</p>
                </Tip>
              );
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: "#1c1915" }}
          />
          <Line
            yAxisId="sales"
            type="monotone"
            dataKey="sales"
            name="Sales"
            stroke="#0e6b66"
            strokeWidth={2.25}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="profit"
            type="monotone"
            dataKey="profit"
            name="Profit"
            stroke="#9a4e1c"
            strokeWidth={2.25}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function SegmentChart() {
  const categories = ["Furniture", "Office Supplies", "Technology"] as const;
  const segments = ["Consumer", "Corporate", "Home Office"];
  const rows = segments.map((segment) => {
    const row: Record<string, string | number> = { segment };
    for (const category of categories) {
      const match = superstore.segments.find(
        (item) => item.segment === segment && item.category === category,
      );
      row[category] = match?.sales ?? 0;
    }
    return row;
  });

  return (
    <ChartFrame className="h-64 w-full md:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e4d9c4" vertical={false} />
          <XAxis
            dataKey="segment"
            tick={{ fill: "#1c1915", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={axisMoney}
            tick={{ fill: "#6b6458", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const total = payload.reduce((sum, item) => sum + Number(item.value ?? 0), 0);
              return (
                <Tip>
                  <p className="font-medium">{label}</p>
                  {payload.map((item) => (
                    <p key={String(item.name)}>
                      {item.name} {money(Number(item.value ?? 0))}
                    </p>
                  ))}
                  <p>Total {money(total)}</p>
                </Tip>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {categories.map((category, index) => (
            <Bar
              key={category}
              dataKey={category}
              stackId="sales"
              fill={CATEGORY_COLOR[category]}
              isAnimationActive={false}
              radius={index === categories.length - 1 ? [3, 3, 0, 0] : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

type ScatterPoint = (typeof superstore.scatter)[number];

export function DiscountScatter() {
  const series = ["Furniture", "Office Supplies", "Technology"].map((category) => ({
    category,
    data: superstore.scatter.filter((point) => point.category === category && point.n >= 10),
  }));

  return (
    <ChartFrame className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e4d9c4" />
          <XAxis
            dataKey="discount"
            type="number"
            name="Discount"
            domain={[0, 0.85]}
            tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
            tick={{ fill: "#6b6458", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="profit"
            type="number"
            name="Profit"
            tickFormatter={axisMoney}
            tick={{ fill: "#6b6458", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <ZAxis dataKey="sales" range={[48, 420]} />
          <ReferenceLine y={0} stroke="#9f2d2d" strokeDasharray="4 4" />
          <ReferenceLine x={0.2} stroke="#1c1915" strokeDasharray="3 3" />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as ScatterPoint;
              return (
                <Tip>
                  <p className="font-medium">{point.category}</p>
                  <p>Discount {pct(point.discount, 0)}</p>
                  <p>Profit {money(point.profit)}</p>
                  <p>Sales {money(point.sales)}</p>
                  <p>{point.n.toLocaleString("en-US")} lines</p>
                </Tip>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((item) => (
            <Scatter
              key={item.category}
              name={item.category}
              data={item.data}
              fill={CATEGORY_COLOR[item.category]}
              isAnimationActive={false}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
