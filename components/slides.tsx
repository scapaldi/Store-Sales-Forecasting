"use client";

import { Button } from "@/components/ui/button";
import { DualBars, LabeledBars } from "@/components/bars";
import { DiscountScatter, GrowthChart, SegmentChart } from "@/components/charts";
import { useDeckNav } from "@/components/deck-nav";
import { count, money, pct, signedPct } from "@/lib/format";
import superstore from "@/lib/superstore.json";

const CATEGORY_COLOR: Record<string, string> = {
  Furniture: "bg-furniture",
  "Office Supplies": "bg-sales",
  Technology: "bg-tech",
};

export type SlideDef = {
  id: string;
  label: string;
  Content: () => React.JSX.Element;
};

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-xl border bg-card px-4 py-4">
      <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl tabular-nums tracking-tight">{value}</p>
      {note ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function Frame({
  kicker,
  title,
  lede,
  children,
}: {
  kicker: string;
  title: string;
  lede?: string;
  children?: React.ReactNode;
}) {
  return (
    <article className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header>
        <p className="text-[11px] font-medium tracking-[0.18em] text-sales uppercase">
          {kicker}
        </p>
        <h2 className="mt-2 max-w-3xl font-serif text-3xl leading-tight text-balance md:text-4xl">
          {title}
        </h2>
        {lede ? (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
            {lede}
          </p>
        ) : null}
      </header>
      {children}
    </article>
  );
}

function OpenSlide() {
  const go = useDeckNav();
  const { kpis, yearly } = superstore;
  const salesGrowth = yearly[yearly.length - 1].sales / yearly[0].sales - 1;
  const profitGrowth = yearly[yearly.length - 1].profit / yearly[0].profit - 1;

  return (
    <article className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center gap-8 py-6">
      <header>
        <p className="text-[11px] font-medium tracking-[0.18em] text-sales uppercase">
          Global Superstore · January 2016–December 2019
        </p>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-[1.08] text-balance md:text-6xl">
          Sales doubled. Profit kept pace. Discount did not.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
          {count(kpis.orders)} orders across {count(kpis.countries)} countries. Sales grew{" "}
          {signedPct(salesGrowth, 0)} and profit grew {signedPct(profitGrowth, 0)}. The loss
          sits in tables, in discounts past 20%, and in a handful of states.
        </p>
      </header>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Sales", money(kpis.sales)],
          ["Profit", money(kpis.profit)],
          ["Margin", pct(kpis.margin)],
          ["Orders", count(kpis.orders)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card px-4 py-3">
            <dt className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
              {label}
            </dt>
            <dd className="mt-1 font-serif text-2xl tabular-nums md:text-3xl">{value}</dd>
          </div>
        ))}
      </dl>
      <div>
        <Button type="button" size="lg" onClick={() => go(1)}>
          Start with the headline
        </Button>
      </div>
    </article>
  );
}

function ResultsSlide() {
  const { kpis, categories, returnsSummary } = superstore;
  const byName = Object.fromEntries(categories.map((item) => [item.name, item]));

  return (
    <Frame
      kicker="How are we doing?"
      title={`${money(kpis.sales)} of sales, ${money(kpis.profit)} of profit, an ${pct(kpis.margin)} margin.`}
      lede={`${pct(kpis.negLineShare, 0)} of order lines lose money, and those lines are ${pct(kpis.negSalesShare)} of sales. The average line is discounted ${pct(kpis.avgDiscount)}. Weighted by sales, the discount is ${pct(kpis.weightedDiscount)} — larger tickets are cut less than the line average.`}
    >
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric label="Sales" value={money(kpis.sales)} note={`${count(kpis.lines)} order lines`} />
        <Metric label="Profit" value={money(kpis.profit)} note="Sum of line profit" />
        <Metric label="Margin" value={pct(kpis.margin)} note="Profit ÷ sales" />
        <Metric label="Orders" value={count(kpis.orders)} note={`${count(kpis.customers)} customers`} />
        <Metric
          label="Avg discount"
          value={pct(kpis.avgDiscount)}
          note={`${pct(kpis.weightedDiscount)} weighted by sales`}
        />
      </dl>
      <div className="grid gap-3 md:grid-cols-3">
        {categories.map((category) => (
          <div key={category.name} className="rounded-xl border bg-card px-4 py-3">
            <p className="text-sm">{category.name}</p>
            <p className="mt-1 font-serif text-2xl tabular-nums">{pct(category.margin)} margin</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {money(category.sales)} sales · {money(category.profit)} profit
            </p>
          </div>
        ))}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        Technology ({pct(byName.Technology.margin)}) and Office Supplies (
        {pct(byName["Office Supplies"].margin)}) carry the margin. Furniture (
        {pct(byName.Furniture.margin)}) is the drag. Returns are not backed out of these
        totals: {count(returnsSummary.returnedOrders)} flagged orders,{" "}
        {money(returnsSummary.returnedSales)} of sales, stay inside the book.
      </p>
    </Frame>
  );
}

function GrowthSlide() {
  const { yearly, monthly } = superstore;
  const first = yearly[0];
  const last = yearly[yearly.length - 1];
  const peak = monthly.reduce((best, point) => (point.sales > best.sales ? point : best));
  const salesGrowth = last.sales / first.sales - 1;
  const profitGrowth = last.profit / first.profit - 1;

  return (
    <Frame
      kicker="Are we growing?"
      title={`Sales grew ${signedPct(salesGrowth, 0)}. Profit grew ${signedPct(profitGrowth, 0)}, then the margin stalled.`}
      lede={`From ${first.year} to ${last.year}, sales went from ${money(first.sales)} to ${money(last.sales)} and profit from ${money(first.profit)} to ${money(last.profit)}. Margin peaked at ${pct(yearly[2].margin)} in ${yearly[2].year} and eased to ${pct(last.margin)} while sales kept climbing. ${peak.label} is the peak month, at ${money(peak.sales)}.`}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {yearly.map((year, index) => {
          const prior = yearly[index - 1];
          return (
            <div key={year.year} className="rounded-xl border bg-card px-4 py-3">
              <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                {year.year}
              </p>
              <p className="mt-1 font-serif text-2xl tabular-nums">{money(year.sales)}</p>
              <p className="text-xs text-profit tabular-nums">{money(year.profit)} profit</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {pct(year.margin)} margin
                {prior ? ` · ${signedPct(year.sales / prior.sales - 1)} sales` : " · base year"}
              </p>
            </div>
          );
        })}
      </div>
      <div className="rounded-xl border bg-card p-3 md:p-4">
        <GrowthChart />
        <p className="px-2 text-[11px] text-muted-foreground">
          Sales on the left axis, profit on the right. The second half of each year is the
          heavy season.
        </p>
      </div>
    </Frame>
  );
}

function MixSlide() {
  const rows = [...superstore.subcats].sort((a, b) => b.sales - a.sales);
  const tables = rows.find((row) => row.name === "Tables");
  const tablesByMarket = superstore.focus.filter((item) => item.name === "Tables");
  const us = Object.fromEntries(superstore.usSubcats.map((item) => [item.name, item]));

  return (
    <Frame
      kicker="Where is money made or lost?"
      title="Phones, copiers, and chairs make the money. Tables lose it in every market."
      lede={
        tables
          ? `Tables are the only sub-category with a negative total: ${money(tables.profit)} on ${money(tables.sales)} of sales, a ${pct(tables.margin)} margin. Bookcases and machines are profitable globally. In the United States they are not a comfort: bookcases lose ${money(Math.abs(us.Bookcases.profit))} and machines keep ${money(us.Machines.profit)} on ${money(us.Machines.sales)}.`
          : undefined
      }
    >
      <div className="rounded-xl border bg-card p-4">
        <DualBars
          rows={rows.map((row) => ({
            name: row.name,
            sales: row.sales,
            profit: row.profit,
            hint: row.category,
            tone:
              row.category === "Furniture"
                ? "bg-furniture"
                : row.category === "Technology"
                  ? "bg-tech"
                  : "bg-sales",
          }))}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tablesByMarket.map((item) => (
          <div key={item.market} className="rounded-xl border bg-card px-4 py-3">
            <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
              Tables · {item.market}
            </p>
            <p className="mt-1 font-serif text-2xl text-loss tabular-nums">
              {money(item.profit)}
            </p>
            <p className="text-xs text-muted-foreground">{money(item.sales)} sales</p>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function PlacesSlide() {
  const regions = [...superstore.regions].sort((a, b) => b.sales - a.sales);
  const thin = [...superstore.regions].sort((a, b) => a.margin - b.margin)[0];
  const thick = [...superstore.regions].sort((a, b) => b.margin - a.margin)[0];
  const texas = superstore.usStates.find((state) => state.state === "Texas");
  const losers = superstore.usStates.filter((state) => state.profit < 0);

  return (
    <Frame
      kicker="Which places matter?"
      title="Region is not four US territories. State is where the loss concentrates."
      lede={`This file has 13 regions. East and West are United States only. Central is led by France and Germany, and South mixes the US with Brazil, Italy, and Spain. ${thin.name} runs the thinnest margin (${pct(thin.margin)}). ${thick.name} runs the thickest (${pct(thick.margin)}) on a small base. Texas sells ${texas ? money(texas.sales) : ""} and loses ${texas ? money(Math.abs(texas.profit)) : ""}.`}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-medium">Sales and profit by region</h3>
          <div className="mt-3">
            <DualBars
              rows={regions.map((region) => ({
                name: region.name,
                sales: region.sales,
                profit: region.profit,
              }))}
            />
          </div>
        </section>
        <div className="flex flex-col gap-4">
          <section className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-medium">Largest states, any country</h3>
            <div className="mt-3">
              <DualBars
                rows={superstore.states.map((state) => ({
                  name: state.state,
                  hint: state.country,
                  sales: state.sales,
                  profit: state.profit,
                }))}
              />
            </div>
          </section>
          <section className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-medium">United States, top states</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              California and New York fund the US book.{" "}
              {losers.map((state) => state.state).join(", ")} lose money.
            </p>
            <div className="mt-3">
              <DualBars
                rows={superstore.usStates.map((state) => ({
                  name: state.state,
                  sales: state.sales,
                  profit: state.profit,
                }))}
              />
            </div>
          </section>
        </div>
      </div>
    </Frame>
  );
}

function BuyersSlide() {
  const order = ["Consumer", "Corporate", "Home Office"];
  const totals = order.map(
    (segment) => superstore.segmentTotals.find((item) => item.segment === segment)!,
  );

  return (
    <Frame
      kicker="Who buys?"
      title="Consumers are half the book. The category mix barely changes."
      lede="Segment tells you how big the customer is, not what they buy. Technology is a bit over a third of sales in every segment, furniture about a third, office supplies the rest. Margin sits in a tight band."
    >
      <div className="grid gap-3 md:grid-cols-3">
        {totals.map((segment) => (
          <div key={segment.segment} className="rounded-xl border bg-card px-4 py-3">
            <p className="text-sm">{segment.segment}</p>
            <p className="mt-1 font-serif text-3xl tabular-nums">{pct(segment.share, 0)}</p>
            <p className="text-xs text-muted-foreground">
              {money(segment.sales)} sales · {pct(segment.margin)} margin ·{" "}
              {count(segment.orders)} orders
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-3 md:p-4">
        <SegmentChart />
        <p className="px-2 text-[11px] text-muted-foreground">
          Stacked sales by category. The stacks are different heights and almost the same
          recipe.
        </p>
      </div>
    </Frame>
  );
}

function RankSlide() {
  const { products, customers, kpis } = superstore;
  const productShare = products.reduce((sum, item) => sum + item.sales, 0) / kpis.sales;
  const customerShare = customers.reduce((sum, item) => sum + item.sales, 0) / kpis.sales;
  const canon = products.find((item) => item.name.includes("imageCLASS"));
  const lossProduct = products.find((item) => item.profit < 0);
  const lossCustomer = customers.find((item) => item.profit < 0);

  return (
    <Frame
      kicker="Which products and customers?"
      title="The top 10 are a reading list, not the business."
      lede={`There are ${count(kpis.products)} products and ${count(kpis.customers)} customers. The top 10 products are ${pct(productShare)} of sales. The top 10 customers are ${pct(customerShare)}. ${canon ? `${canon.name} is the profit outlier in the sales ranking (${money(canon.profit)} on ${money(canon.sales)}).` : ""} ${lossProduct ? `${lossProduct.name} makes the sales list and loses ${money(Math.abs(lossProduct.profit))}.` : ""}`}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-medium">Top 10 products by sales</h3>
          <div className="mt-3">
            <DualBars
              wide
              rows={products.map((product) => ({
                name: product.name,
                hint: product.category,
                sales: product.sales,
                profit: product.profit,
                tone: CATEGORY_COLOR[product.category],
              }))}
            />
          </div>
        </section>
        <section className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-medium">Top 10 customers by sales</h3>
          <div className="mt-3">
            <DualBars
              wide
              rows={customers.map((customer) => ({
                name: customer.name,
                hint: `${customer.segment} · ${count(customer.orders)} orders`,
                sales: customer.sales,
                profit: customer.profit,
              }))}
            />
          </div>
          {lossCustomer ? (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {lossCustomer.name} ({lossCustomer.segment}) is the top-10 buyer who loses
              money: {money(lossCustomer.profit)} on {money(lossCustomer.sales)} of sales.
            </p>
          ) : null}
        </section>
      </div>
    </Frame>
  );
}

function DiscountSlide() {
  const bins = superstore.discountBins;
  const deep = bins.find((bin) => bin.label === "50%+");
  const maxAbs = Math.max(...bins.map((bin) => Math.abs(bin.profit)));

  return (
    <Frame
      kicker="Is discount helping?"
      title="Through 20% off, every band makes money. After that, every band loses it."
      lede={
        deep
          ? `The 50%+ band sells ${money(deep.sales)} and loses ${money(Math.abs(deep.profit))} — the loss is larger than the sales. Point size on the scatter is sales. The dashed vertical line is 20% off.`
          : undefined
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-3 md:p-4">
          <DiscountScatter />
        </div>
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-medium">Profit by discount band</h3>
          <ul className="mt-4 space-y-3">
            {bins.map((bin) => {
              const width = (Math.abs(bin.profit) / maxAbs) * 50;
              return (
                <li key={bin.label} className="grid grid-cols-[4.5rem_1fr_4.5rem] items-center gap-2">
                  <span className="text-xs tabular-nums">{bin.label}</span>
                  <div className="relative h-3 rounded-full bg-muted">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/30" />
                    <div
                      className={`absolute inset-y-0 rounded-full ${bin.profit < 0 ? "bg-loss" : "bg-profit"}`}
                      style={
                        bin.profit < 0
                          ? { right: "50%", width: `${width}%` }
                          : { left: "50%", width: `${width}%` }
                      }
                    />
                  </div>
                  <span
                    className={`text-right text-[11px] tabular-nums ${bin.profit < 0 ? "text-loss" : "text-profit"}`}
                  >
                    {money(bin.profit)}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Zero discount alone produces {money(bins[0].profit)} of profit on{" "}
            {money(bins[0].sales)} of sales. The red bars are not a furniture problem. The
            same bend shows up in every category.
          </p>
        </div>
      </div>
    </Frame>
  );
}

function ShipSlide() {
  const modes = [...superstore.shipModes].sort((a, b) => b.sales - a.sales);
  const maxLines = Math.max(...superstore.shipDays.map((day) => day.lines));
  const standard = modes.find((mode) => mode.mode === "Standard Class");
  const lineShare = standard ? standard.lines / superstore.kpis.lines : 0;

  return (
    <Frame
      kicker="When do we ship?"
      title={
        standard
          ? `Standard Class is ${pct(lineShare, 0)} of lines and about ${standard.avgDays.toFixed(0)} days to the door.`
          : "Shipping is an operations story."
      }
      lede="Margin stays between 11.4% and 11.8% in every ship mode. Speed is not where profit leaks. A few orders use more than one mode across lines, so the counts below are lines and sales, which add up."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-medium">Sales by ship mode</h3>
          <div className="mt-3">
            <DualBars
              rows={modes.map((mode) => ({
                name: mode.mode,
                hint: `${mode.avgDays.toFixed(1)} days on average · ${pct(mode.profit / mode.sales)} margin`,
                sales: mode.sales,
                profit: mode.profit,
              }))}
            />
          </div>
        </section>
        <section className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-medium">Days from order to ship</h3>
          <p className="mt-1 text-xs text-muted-foreground">Order lines. Ship date minus order date.</p>
          <div className="mt-4 flex h-48 items-end gap-2">
            {superstore.shipDays.map((day) => (
              <div key={day.days} className="flex h-full flex-1 flex-col justify-end gap-1">
                <span className="text-center text-[10px] tabular-nums text-muted-foreground">
                  {day.lines >= 1000 ? `${(day.lines / 1000).toFixed(1)}k` : day.lines}
                </span>
                <div
                  className="rounded-t bg-sales"
                  style={{ height: `${Math.max(4, (day.lines / maxLines) * 100)}%` }}
                />
                <span className="text-center text-[11px] tabular-nums">{day.days}d</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Frame>
  );
}

function ReturnsSlide() {
  const { returnsSummary, returnRegions, returnCategories } = superstore;
  const recorded = returnRegions.filter((region) => region.recorded);
  const missing = returnRegions.filter((region) => !region.recorded);
  const maxRate = Math.max(...recorded.map((region) => region.rate));
  const ranked = [...recorded].sort((a, b) => b.rate - a.rate);

  return (
    <Frame
      kicker="Returns?"
      title={`${pct(returnsSummary.orderRate)} of orders are flagged returned. That flag is not a sales reversal.`}
      lede={`${count(returnsSummary.returnedOrders)} orders and ${money(returnsSummary.returnedSales)} of sales match the Returns sheet, joined on order and market. Those sales and their ${money(returnsSummary.returnedProfit)} of profit stay inside the headline totals. Category rates are close. Place is not.`}
    >
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-medium">Return rate by region</h3>
          <p className="mt-1 text-xs text-muted-foreground">Returned orders ÷ orders.</p>
          <div className="mt-3">
            <LabeledBars
              rows={ranked.map((region) => ({
                name: region.name,
                value: region.rate,
                note: `${pct(region.rate)} · ${count(region.returnedOrders)}`,
              }))}
              max={maxRate}
              format={pct}
            />
          </div>
          <ul className="mt-4 space-y-2 border-t pt-3">
            {missing.map((region) => (
              <li key={region.name} className="flex items-center justify-between text-sm">
                <span>{region.name}</span>
                <span className="text-xs text-muted-foreground">No return records</span>
              </li>
            ))}
          </ul>
        </section>
        <div className="flex flex-col gap-3">
          {returnCategories
            .slice()
            .sort((a, b) => b.rate - a.rate)
            .map((category) => (
              <div key={category.name} className="rounded-xl border bg-card px-4 py-3">
                <p className="text-sm">{category.name}</p>
                <p className="mt-1 font-serif text-3xl tabular-nums">{pct(category.rate)}</p>
                <p className="text-xs text-muted-foreground">
                  {count(category.returnedOrders)} of {count(category.orders)} orders ·{" "}
                  {money(category.returnedSales)} sales
                </p>
              </div>
            ))}
          <p className="text-sm leading-6 text-muted-foreground">
            Africa, Canada, and the EMEA region have no matching return rows. Read that as
            unreported, not as a perfect operation.
          </p>
        </div>
      </div>
    </Frame>
  );
}

function CloseSlide() {
  const tables = superstore.subcats.find((row) => row.name === "Tables");
  const texas = superstore.usStates.find((state) => state.state === "Texas");
  const deep = superstore.discountBins.find((bin) => bin.label === "50%+");

  const moves = [
    {
      n: "01",
      title: "Cap the discount at 20%.",
      body: deep
        ? `Every band through 20% off is profitable. From 20–30% upward, every band loses money, in every category. The 50%+ band sells ${money(deep.sales)} and loses ${money(Math.abs(deep.profit))}.`
        : "",
    },
    {
      n: "02",
      title: "Reprice tables, or stop discounting them.",
      body: tables
        ? `Tables lose ${money(Math.abs(tables.profit))} on ${money(tables.sales)} of sales, and they lose money in APAC, EMEA, LATAM, and US/Canada. Bookcases join them in the United States.`
        : "",
    },
    {
      n: "03",
      title: "Treat Texas as a loss, not a growth state.",
      body: texas
        ? `Texas sells ${money(texas.sales)} and loses ${money(Math.abs(texas.profit))}. Pennsylvania, Ohio, and Illinois do the same at a smaller scale. California and New York are the US profit centers.`
        : "",
    },
  ];

  return (
    <Frame
      kicker="What to do with this"
      title="The growth is real. The leak is specific."
      lede="Do not ‘fix’ a book that nearly doubled. Change the three places where sales and profit part ways."
    >
      <ol className="grid gap-3 md:grid-cols-3">
        {moves.map((move) => (
          <li key={move.n} className="rounded-xl border bg-card p-4">
            <p className="font-serif text-2xl text-sales">{move.n}</p>
            <h3 className="mt-2 font-serif text-2xl leading-tight">{move.title}</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{move.body}</p>
          </li>
        ))}
      </ol>
    </Frame>
  );
}

export const SLIDES: SlideDef[] = [
  { id: "open", label: "Open", Content: OpenSlide },
  { id: "results", label: "How are we doing?", Content: ResultsSlide },
  { id: "growth", label: "Are we growing?", Content: GrowthSlide },
  { id: "mix", label: "Where is money made?", Content: MixSlide },
  { id: "places", label: "Which places matter?", Content: PlacesSlide },
  { id: "buyers", label: "Who buys?", Content: BuyersSlide },
  { id: "ranks", label: "Products and customers", Content: RankSlide },
  { id: "discount", label: "Is discount helping?", Content: DiscountSlide },
  { id: "shipping", label: "When do we ship?", Content: ShipSlide },
  { id: "returns", label: "Returns", Content: ReturnsSlide },
  { id: "close", label: "What to do", Content: CloseSlide },
];
