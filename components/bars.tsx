import { money } from "@/lib/format";

export function DualBars({
  rows,
  wide = false,
  onSelect,
}: {
  rows: {
    name: string;
    sales: number;
    profit: number;
    hint?: string;
    tone?: string;
  }[];
  wide?: boolean;
  onSelect?: (name: string) => void;
}) {
  const maxSales = Math.max(...rows.map((row) => row.sales), 1);
  const maxProfit = Math.max(...rows.map((row) => Math.abs(row.profit)), 1);

  return (
    <div>
      <div
        className={`mb-2 hidden gap-3 text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase md:grid ${
          wide ? "md:grid-cols-[minmax(0,16rem)_1fr_1fr]" : "md:grid-cols-[minmax(0,11rem)_1fr_1fr]"
        }`}
      >
        <span />
        <span>Sales</span>
        <span>Profit</span>
      </div>
      <ul>
        {rows.map((row) => (
          <li key={row.name}>
            <button
              type="button"
              onClick={onSelect ? () => onSelect(row.name) : undefined}
              className={`grid w-full gap-1 border-b border-border/80 bg-transparent py-2 text-left font-inherit text-inherit md:items-center md:gap-3 md:border-0 md:py-1 ${
                wide ? "md:grid-cols-[minmax(0,16rem)_1fr_1fr]" : "md:grid-cols-[minmax(0,11rem)_1fr_1fr]"
              } ${row.profit < 0 ? "bg-loss/5 md:px-1" : ""} ${
                onSelect ? "cursor-pointer hover:bg-black/[0.03]" : "cursor-default"
              }`}
            >
            <div className="min-w-0">
              <p className={wide ? "line-clamp-2 text-sm leading-snug" : "truncate text-sm"} title={row.name}>
                {row.name}
              </p>
              {row.hint ? (
                <p className="truncate text-[11px] text-muted-foreground">{row.hint}</p>
              ) : null}
            </div>
            <Meter
              value={row.sales}
              max={maxSales}
              label={money(row.sales)}
              className={row.tone ?? "bg-sales"}
            />
            <Meter
              value={Math.abs(row.profit)}
              max={maxProfit}
              label={money(row.profit)}
              className={row.profit < 0 ? "bg-loss" : "bg-profit"}
              labelClass={row.profit < 0 ? "text-loss" : "text-profit"}
            />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Meter({
  value,
  max,
  label,
  className,
  labelClass,
}: {
  value: number;
  max: number;
  label: string;
  className: string;
  labelClass?: string;
}) {
  const width = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${className}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span
        className={`w-14 shrink-0 text-right text-[11px] tabular-nums ${labelClass ?? ""}`}
      >
        {label}
      </span>
    </div>
  );
}

export function LabeledBars({
  rows,
  max,
  format,
}: {
  rows: { name: string; value: number; note?: string; muted?: boolean }[];
  max?: number;
  format: (n: number) => string;
}) {
  const ceiling = max ?? Math.max(...rows.map((row) => row.value), 0.0001);
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.name} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3">
          <span className="truncate text-sm" title={row.name}>
            {row.name}
          </span>
          <div className="h-2.5 rounded-full bg-muted">
            {row.muted ? (
              <div className="h-full w-2 rounded-full border border-dashed border-muted-foreground/50" />
            ) : (
              <div
                className="h-full rounded-full bg-sales"
                style={{ width: `${(row.value / ceiling) * 100}%` }}
              />
            )}
          </div>
          <span className="w-24 text-right text-xs tabular-nums text-muted-foreground">
            {row.note ?? format(row.value)}
          </span>
        </li>
      ))}
    </ul>
  );
}
