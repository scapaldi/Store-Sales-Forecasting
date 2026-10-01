export type SalesRow = {
  orderId: string;
  year: string;
  region: string;
  state: string;
  category: string;
  subCategory: string;
  product: string;
  sales: number;
  quantity: number;
  discount: number;
  profit: number;
  shipMode: string;
  shipDays: number | null;
};

const COLUMNS = [
  "Order ID",
  "Order Date",
  "Region",
  "State",
  "Sub-Category",
  "Sales",
  "Quantity",
  "Profit",
] as const;

export function assetPath(file: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}/${file.replace(/^\//, "")}`;
}

/** Order dates may be M/D/YYYY (Superstore export) or YYYY-MM-DD. */
export function orderYear(value: string): string {
  const date = value.trim();
  const iso = date.match(/^(\d{4})-\d{1,2}-\d{1,2}/);
  if (iso) return iso[1];
  const us = date.match(/^\d{1,2}\/\d{1,2}\/(\d{4})/);
  return us ? us[1] : "";
}

/** Superstore exports are Windows-1252; UTF-8 files still decode as UTF-8. */
export function decodeCsv(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export type SalesFile = {
  rows: SalesRow[];
  hasReturns: boolean;
};

export function parseCsv(text: string): SalesFile {
  const records = parseRecords(text.replace(/^\uFEFF/, ""));
  if (records.length === 0) return { rows: [], hasReturns: false };
  const header = records[0].map((cell) => cell.trim());
  const hasReturns = header.some((name) => /return/i.test(name));
  const index = Object.fromEntries(COLUMNS.map((name) => [name, header.indexOf(name)]));
  const missing = COLUMNS.filter((name) => index[name] < 0);
  if (missing.length) {
    throw new Error(`Missing column ${missing[0]}`);
  }
  const rows: SalesRow[] = [];
  for (const record of records.slice(1)) {
    if (record.every((cell) => cell.trim() === "")) continue;
    const cell = (name: (typeof COLUMNS)[number]) => record[index[name]] ?? "";
    const sales = Number(cell("Sales"));
    const quantity = Number(cell("Quantity"));
    const profit = Number(cell("Profit"));
    const discount = Number(optional(record, header, "Discount"));
    const orderDate = cell("Order Date");
    rows.push({
      orderId: cell("Order ID").trim(),
      year: orderYear(orderDate),
      region: cell("Region").trim(),
      state: cell("State").trim(),
      category: optional(record, header, "Category").trim(),
      subCategory: cell("Sub-Category").trim(),
      product: optional(record, header, "Product Name").trim(),
      sales: Number.isFinite(sales) ? sales : 0,
      quantity: Number.isFinite(quantity) ? quantity : 0,
      discount: Number.isFinite(discount) ? discount : 0,
      profit: Number.isFinite(profit) ? profit : 0,
      shipMode: optional(record, header, "Ship Mode").trim(),
      shipDays: daysBetween(orderDate, optional(record, header, "Ship Date")),
    });
  }
  return { rows, hasReturns };
}

export async function loadSales(): Promise<SalesFile> {
  const response = await fetch(assetPath("data.csv"));
  if (!response.ok) {
    throw new Error("Could not load the sales file.");
  }
  const text = decodeCsv(await response.arrayBuffer());
  if (!text.trim()) return { rows: [], hasReturns: false };
  try {
    return parseCsv(text);
  } catch {
    throw new Error("Could not read the sales file.");
  }
}

function optional(record: string[], header: string[], name: string): string {
  const index = header.indexOf(name);
  return index < 0 ? "" : (record[index] ?? "");
}

/** Days from order date to ship date. Accepts M/D/YYYY and YYYY-MM-DD. */
export function daysBetween(start: string, end: string): number | null {
  const from = parseDay(start);
  const to = parseDay(end);
  if (from == null || to == null) return null;
  return Math.round((to - from) / 86_400_000);
}

function parseDay(value: string): number | null {
  const text = value.trim();
  const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) return Date.UTC(Number(us[3]), Number(us[1]) - 1, Number(us[2]));
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

function parseRecords(text: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell !== "")) records.push(row);
      row = [];
      continue;
    }
    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell !== "")) records.push(row);
  }
  return records;
}
