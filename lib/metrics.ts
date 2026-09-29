import type { SalesRow } from "@/lib/csv";

const REGION_ORDER = ["West", "East", "Central", "South"] as const;

export type SalesPoint = { name: string; sales: number };
export type YearPoint = { year: string; sales: number };

export type Summary = {
  sales: number;
  profit: number;
  margin: number;
  avgQuantity: number;
  regions: SalesPoint[];
  years: YearPoint[];
  subCategories: SalesPoint[];
  salesByState: Map<string, number>;
};

export function summarize(rows: SalesRow[]): Summary {
  let sales = 0;
  let profit = 0;
  let quantity = 0;
  const orders = new Set<string>();
  const regions = new Map<string, number>();
  const years = new Map<string, number>();
  const subCategories = new Map<string, number>();
  const salesByState = new Map<string, number>();

  for (const row of rows) {
    sales += row.sales;
    profit += row.profit;
    quantity += row.quantity;
    if (row.orderId) orders.add(row.orderId);
    add(regions, row.region, row.sales);
    add(years, row.year, row.sales);
    add(subCategories, row.subCategory, row.sales);
    add(salesByState, row.state, row.sales);
  }

  const regionNames = [
    ...REGION_ORDER.filter((name) => regions.has(name) || rows.length > 0),
    ...[...regions.keys()].filter((name) => !REGION_ORDER.includes(name as (typeof REGION_ORDER)[number])),
  ];

  return {
    sales,
    profit,
    margin: sales ? profit / sales : 0,
    avgQuantity: orders.size ? quantity / orders.size : 0,
    regions: regionNames.map((name) => ({ name, sales: regions.get(name) ?? 0 })),
    years: [...years.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, total]) => ({ year, sales: total })),
    subCategories: [...subCategories.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, total]) => ({ name, sales: total })),
    salesByState,
  };
}

function add(map: Map<string, number>, key: string, value: number) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + value);
}
