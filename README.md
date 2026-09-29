# Store sales dashboard

A static page for the store sales forecasting file (2014–2017). The browser loads `public/data.csv` and shows total sales, total profit, profit margin, average quantity per order, sales by region, sales by year, sales by sub-category, and a US state map.

Published site: [https://scapaldi.github.io/Store-Sales-Forecasting/](https://scapaldi.github.io/Store-Sales-Forecasting/)

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3847](http://localhost:3847).

## Refresh the numbers

`public/data.csv` is `stores_sales_forecasting.csv` as exported, unchanged. Replace it with a newer export and push to `main`. GitHub Pages rebuilds the site from that file.

The page needs these columns: `Order ID`, `Order Date`, `Region`, `State`, `Sub-Category`, `Sales`, `Quantity`, `Profit`. Other columns are ignored. The file can be Windows-1252 or UTF-8, and order dates can be `M/D/YYYY` or `YYYY-MM-DD`.

`npm run build` writes the static site to `out/`. A push to `main` on GitHub runs `.github/workflows/pages.yml` with `GITHUB_PAGES=true`, which sets the site base path to `/Store-Sales-Forecasting`. Local development stays at `/`.
