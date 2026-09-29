import data from "./furniture.json";

export type Row = (typeof data.rows)[number];

export const furnitureRows: Row[] = data.rows;

export const YEARS = [2014, 2015, 2016, 2017] as const;
export const REGIONS = ["West", "East", "Central", "South"] as const;
export const SEGMENTS = ["Consumer", "Corporate", "Home Office"] as const;
export const SUBS = ["Chairs", "Furnishings", "Tables", "Bookcases"] as const;
export const MODES = ["Standard Class", "Second Class", "First Class", "Same Day"] as const;

export const SUB_COLOR: Record<string, string> = {
  Chairs: "#118DFF",
  Furnishings: "#12239E",
  Tables: "#D64550",
  Bookcases: "#E66C37",
};

export type Selection = {
  years: number[];
  regions: string[];
  segments: string[];
  subs: string[];
  modes: string[];
  states: string[];
};

export function initialSelection(): Selection {
  return {
    years: [...YEARS],
    regions: [...REGIONS],
    segments: [...SEGMENTS],
    subs: [...SUBS],
    modes: [...MODES],
    states: [],
  };
}

export function yearOf(row: Row): number {
  return Number(row.date.slice(0, 4));
}

export function shipDays(row: Row): number {
  return Math.round((Date.parse(row.ship) - Date.parse(row.date)) / 86_400_000);
}

export function applyFilters(source: Row[], selection: Selection): Row[] {
  return source.filter((row) => {
    if (!selection.years.includes(yearOf(row))) return false;
    if (!selection.regions.includes(row.region)) return false;
    if (!selection.segments.includes(row.segment)) return false;
    if (!selection.subs.includes(row.sub)) return false;
    if (!selection.modes.includes(row.mode)) return false;
    if (selection.states.length > 0 && !selection.states.includes(row.state)) return false;
    return true;
  });
}

export type Pair = { name: string; sales: number; profit: number; hint?: string };

function group(rows: Row[], key: (row: Row) => string): Map<string, Pair> {
  const map = new Map<string, Pair>();
  for (const row of rows) {
    const name = key(row);
    const current = map.get(name) ?? { name, sales: 0, profit: 0 };
    current.sales += row.sales;
    current.profit += row.profit;
    map.set(name, current);
  }
  return map;
}

export function kpis(rows: Row[]) {
  const sales = rows.reduce((total, row) => total + row.sales, 0);
  const profit = rows.reduce((total, row) => total + row.profit, 0);
  const orders = new Set(rows.map((row) => row.order)).size;
  const avgDiscount = rows.length ? rows.reduce((total, row) => total + row.discount, 0) / rows.length : 0;
  const weightedDiscount = sales
    ? rows.reduce((total, row) => total + row.discount * row.sales, 0) / sales
    : 0;
  return {
    sales,
    profit,
    margin: sales ? profit / sales : 0,
    orders,
    lines: rows.length,
    avgDiscount,
    weightedDiscount,
  };
}

export function bySubcategory(rows: Row[]): Pair[] {
  return [...group(rows, (row) => row.sub).values()].sort((a, b) => b.sales - a.sales);
}

export function byRegion(rows: Row[]): Pair[] {
  const order = new Map<string, number>(REGIONS.map((name, index) => [name, index]));
  return [...group(rows, (row) => row.region).values()].sort(
    (a, b) => (order.get(a.name) ?? 9) - (order.get(b.name) ?? 9),
  );
}

export function byState(rows: Row[], limit = 10): Pair[] {
  return [...group(rows, (row) => row.state).values()]
    .sort((a, b) => b.sales - a.sales)
    .slice(0, limit);
}

export function byMonth(rows: Row[]) {
  const map = new Map<string, { month: string; sales: number; profit: number }>();
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    const current = map.get(month) ?? { month, sales: 0, profit: 0 };
    current.sales += row.sales;
    current.profit += row.profit;
    map.set(month, current);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export const LATEST_YEAR = 2017;

export function orderMetrics(rows: Row[]) {
  const byOrder = new Map<string, { qty: number; days: number }>();
  for (const row of rows) {
    const current = byOrder.get(row.order) ?? { qty: 0, days: shipDays(row) };
    current.qty += row.qty;
    byOrder.set(row.order, current);
  }
  let qty = 0;
  let days = 0;
  for (const order of byOrder.values()) {
    qty += order.qty;
    days += order.days;
  }
  const orders = byOrder.size;
  return {
    orders,
    avgQty: orders ? qty / orders : 0,
    avgShipDays: orders ? days / orders : 0,
  };
}

export type MarginRow = Pair & { margin: number };

export function marginBy(rows: Row[], key: (row: Row) => string): MarginRow[] {
  return [...group(rows, key).values()]
    .map((item) => ({ ...item, margin: item.sales ? item.profit / item.sales : 0 }))
    .sort((a, b) => b.margin - a.margin);
}

export function byYear(rows: Row[]) {
  const map = new Map<number, { year: number; sales: number; profit: number; orders: Set<string> }>();
  for (const row of rows) {
    const year = yearOf(row);
    const current = map.get(year) ?? { year, sales: 0, profit: 0, orders: new Set<string>() };
    current.sales += row.sales;
    current.profit += row.profit;
    current.orders.add(row.order);
    map.set(year, current);
  }
  return [...map.values()]
    .sort((a, b) => a.year - b.year)
    .map((item) => ({
      year: item.year,
      sales: item.sales,
      profit: item.profit,
      orders: item.orders.size,
    }));
}

export function segmentStack(rows: Row[]) {
  return SEGMENTS.map((segment) => {
    const entry: Record<string, string | number> = { segment };
    for (const sub of SUBS) {
      entry[sub] = rows
        .filter((row) => row.segment === segment && row.sub === sub)
        .reduce((total, row) => total + row.sales, 0);
    }
    return entry;
  }).filter((entry) => SUBS.some((sub) => Number(entry[sub]) > 0));
}

export function topProducts(rows: Row[], limit = 10): Pair[] {
  return [...group(rows, (row) => row.product).values()]
    .map((item) => {
      const sample = rows.find((row) => row.product === item.name);
      return { ...item, hint: sample?.sub };
    })
    .sort((a, b) => b.sales - a.sales)
    .slice(0, limit);
}

export function topCustomers(rows: Row[], limit = 10): Pair[] {
  return [...group(rows, (row) => row.customer).values()]
    .map((item) => {
      const sample = rows.find((row) => row.customer === item.name);
      const orders = new Set(rows.filter((row) => row.customer === item.name).map((row) => row.order)).size;
      return { ...item, hint: sample ? `${sample.segment} · ${orders} orders` : undefined };
    })
    .sort((a, b) => b.sales - a.sales)
    .slice(0, limit);
}

export type ScatterPoint = {
  product: string;
  sub: string;
  sales: number;
  profit: number;
  discount: number;
};

export function productScatter(rows: Row[]): ScatterPoint[] {
  const map = new Map<string, ScatterPoint & { weight: number }>();
  for (const row of rows) {
    const current = map.get(row.product) ?? {
      product: row.product,
      sub: row.sub,
      sales: 0,
      profit: 0,
      discount: 0,
      weight: 0,
    };
    current.sales += row.sales;
    current.profit += row.profit;
    current.weight += row.discount * row.sales;
    map.set(row.product, current);
  }
  return [...map.values()].map((item) => ({
    product: item.product,
    sub: item.sub,
    sales: item.sales,
    profit: item.profit,
    discount: item.sales ? item.weight / item.sales : 0,
  }));
}

export function byShipMode(rows: Row[]): Pair[] {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.mode, (counts.get(row.mode) ?? 0) + 1);
  return MODES.map((mode) => {
    const pair = group(rows, (row) => row.mode).get(mode) ?? { name: mode, sales: 0, profit: 0 };
    return { ...pair, hint: `${(counts.get(mode) ?? 0).toLocaleString("en-US")} lines` };
  }).filter((item) => item.sales > 0 || item.profit !== 0);
}

export function shipHistogram(rows: Row[]) {
  const counts = new Map<number, number>();
  for (const row of rows) {
    const days = shipDays(row);
    counts.set(days, (counts.get(days) ?? 0) + 1);
  }
  const max = Math.max(7, ...counts.keys());
  return Array.from({ length: max + 1 }, (_, days) => ({ days, lines: counts.get(days) ?? 0 }));
}
