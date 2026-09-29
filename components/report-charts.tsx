"use client";

import { useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
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
} from "recharts";
import { axisMoney, money, pct } from "@/lib/format";
import { SUB_COLOR, SUBS, type ScatterPoint } from "@/lib/model";

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
  return <div className={className}>{ready ? children : null}</div>;
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-[#e1dfdd] bg-white px-3 py-2 text-xs leading-5 text-[#252423] shadow-md">
      {children}
    </div>
  );
}

type MonthPoint = { month: string; sales: number; profit: number };

export function GrowthChart({ data }: { data: MonthPoint[] }) {
  const ticks =
    data.length > 18
      ? data.filter((point) => point.month.endsWith("-01")).map((point) => point.month)
      : undefined;
  return (
    <ChartFrame className="h-64 w-full md:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#edebe9" vertical={false} />
          <XAxis
            dataKey="month"
            ticks={ticks}
            tickFormatter={(value: string) =>
              value.endsWith("-01") ? value.slice(0, 4) : value.slice(5)
            }
            tick={{ fill: "#605e5c", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="sales"
            tickFormatter={axisMoney}
            tick={{ fill: "#605e5c", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <YAxis
            yAxisId="profit"
            orientation="right"
            tickFormatter={axisMoney}
            tick={{ fill: "#605e5c", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as MonthPoint;
              return (
                <Tip>
                  <p className="font-semibold">{point.month}</p>
                  <p>Sales {money(point.sales)}</p>
                  <p>Profit {money(point.profit)}</p>
                  <p>Margin {point.sales ? pct(point.profit / point.sales) : "—"}</p>
                </Tip>
              );
            }}
          />
          <Legend verticalAlign="top" align="right" iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
          <Line
            yAxisId="sales"
            dataKey="sales"
            name="Sales"
            stroke="#118DFF"
            strokeWidth={2.25}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="profit"
            dataKey="profit"
            name="Profit"
            stroke="#E66C37"
            strokeWidth={2.25}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function SegmentChart({ data }: { data: Record<string, string | number>[] }) {
  return (
    <ChartFrame className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#edebe9" vertical={false} />
          <XAxis
            dataKey="segment"
            tick={{ fill: "#252423", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={axisMoney}
            tick={{ fill: "#605e5c", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const total = payload.reduce((sum, item) => sum + Number(item.value ?? 0), 0);
              return (
                <Tip>
                  <p className="font-semibold">{label}</p>
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
          {SUBS.map((sub, index) => (
            <Bar
              key={sub}
              dataKey={sub}
              stackId="sales"
              fill={SUB_COLOR[sub]}
              isAnimationActive={false}
              radius={index === SUBS.length - 1 ? [2, 2, 0, 0] : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function DiscountScatter({ data }: { data: ScatterPoint[] }) {
  const series = SUBS.map((sub) => ({
    sub,
    points: data.filter((point) => point.sub === sub),
  }));
  return (
    <ChartFrame className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#edebe9" />
          <XAxis
            dataKey="discount"
            type="number"
            name="Discount"
            domain={[0, 0.75]}
            tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
            tick={{ fill: "#605e5c", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="profit"
            type="number"
            tickFormatter={axisMoney}
            tick={{ fill: "#605e5c", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <ZAxis dataKey="sales" range={[40, 360]} />
          <ReferenceLine y={0} stroke="#D64550" strokeDasharray="4 4" />
          <ReferenceLine x={0.2} stroke="#252423" strokeDasharray="3 3" />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as ScatterPoint;
              return (
                <Tip>
                  <p className="max-w-56 font-semibold">{point.product}</p>
                  <p>{point.sub}</p>
                  <p>Discount {pct(point.discount, 0)}</p>
                  <p>Profit {money(point.profit)}</p>
                  <p>Sales {money(point.sales)}</p>
                </Tip>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((item) => (
            <Scatter
              key={item.sub}
              name={item.sub}
              data={item.points}
              fill={SUB_COLOR[item.sub]}
              isAnimationActive={false}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function SalesBars({
  data,
  onSelect,
  labelWidth = 92,
}: {
  data: { name: string; sales: number }[];
  onSelect?: (name: string) => void;
  labelWidth?: number;
}) {
  return (
    <ChartFrame className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="#edebe9" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={axisMoney}
            tick={{ fill: "#605e5c", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={labelWidth}
            tick={{ fill: "#252423", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as { name: string; sales: number };
              return (
                <Tip>
                  <p className="font-semibold">{point.name}</p>
                  <p>Sales {money(point.sales)}</p>
                </Tip>
              );
            }}
          />
          <Bar
            dataKey="sales"
            name="Sales"
            fill="#118DFF"
            radius={[0, 3, 3, 0]}
            isAnimationActive={false}
            cursor={onSelect ? "pointer" : undefined}
            onClick={(item) => {
              const name = (item as { name?: string }).name;
              if (name && onSelect) onSelect(name);
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function YearBars({ data }: { data: { year: string; sales: number }[] }) {
  return (
    <ChartFrame className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#edebe9" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: "#252423", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={axisMoney}
            tick={{ fill: "#605e5c", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as { year: string; sales: number };
              return (
                <Tip>
                  <p className="font-semibold">{point.year}</p>
                  <p>Sales {money(point.sales)}</p>
                </Tip>
              );
            }}
          />
          <Bar dataKey="sales" name="Sales" fill="#118DFF" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function YearTrend({
  data,
}: {
  data: { year: number; sales: number; orders: number }[];
}) {
  return (
    <ChartFrame className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#edebe9" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: "#605e5c", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="sales"
            tickFormatter={axisMoney}
            tick={{ fill: "#118DFF", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <YAxis
            yAxisId="orders"
            orientation="right"
            tick={{ fill: "#E66C37", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as { year: number; sales: number; orders: number };
              return (
                <Tip>
                  <p className="font-semibold">{point.year}</p>
                  <p>Sales {money(point.sales)}</p>
                  <p>Orders {point.orders.toLocaleString("en-US")}</p>
                </Tip>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="sales" dataKey="sales" name="Sales" fill="#118DFF" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Line
            yAxisId="orders"
            dataKey="orders"
            name="Orders"
            stroke="#E66C37"
            strokeWidth={2}
            dot={{ r: 4 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
