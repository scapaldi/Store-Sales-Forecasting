import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { PDFDocument, rgb } from "pdf-lib";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "global-superstore-2016-2019.pdf");
const URL = process.env.SLIDES_URL ?? "http://127.0.0.1:3847/print";
const CHROME = process.env.CHROME_PATH ?? "/usr/local/bin/google-chrome";

const PAGE_W = 960;
const PAGE_H = 540;
const PAPER = rgb(243 / 255, 239 / 255, 230 / 255);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
await page.goto(URL, { waitUntil: "networkidle0", timeout: 60000 });
await page.waitForFunction(() => document.documentElement.dataset.printReady === "true");
await page.waitForFunction(() => document.querySelectorAll(".recharts-surface").length >= 3);
await page.addStyleTag({
  content: "nextjs-portal, [data-nextjs-dev-overlay] { display: none !important; }",
});
await new Promise((resolve) => setTimeout(resolve, 400));

const handles = await page.$$("[data-slide]");
const shots = [];
for (const handle of handles) {
  const label = await handle.evaluate((node) => node.getAttribute("data-label"));
  const buffer = await handle.screenshot({ type: "png" });
  shots.push({ label, buffer });
  console.log("captured", label, buffer.length);
}
await browser.close();

const pdf = await PDFDocument.create();
pdf.setTitle("Global Superstore, 2016–2019");
pdf.setAuthor("Global Superstore review");

function addImagePage(pdfDoc, image, align) {
  const pdfPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  pdfPage.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: PAPER });
  const scale = Math.min(PAGE_W / image.width, PAGE_H / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  const y = align === "top" ? PAGE_H - drawH : (PAGE_H - drawH) / 2;
  pdfPage.drawImage(image, {
    x: (PAGE_W - drawW) / 2,
    y,
    width: drawW,
    height: drawH,
  });
}

for (const shot of shots) {
  const meta = await sharp(shot.buffer).metadata();
  const width = meta.width ?? 1;
  const height = meta.height ?? 1;
  const pagePixelH = (width * 9) / 16;
  const overflow = height / pagePixelH;

  if (overflow <= 1.22) {
    const image = await pdf.embedPng(shot.buffer);
    addImagePage(pdf, image, "center");
    console.log(shot.label, `1 page (overflow ${overflow.toFixed(2)})`);
    continue;
  }

  const sliceCount = Math.ceil(overflow);
  for (let index = 0; index < sliceCount; index += 1) {
    const top = Math.round(index * pagePixelH);
    const pieceH = Math.min(Math.round(pagePixelH), height - top);
    if (pieceH < 8) continue;
    const piece = await sharp(shot.buffer)
      .extract({ left: 0, top, width, height: pieceH })
      .png()
      .toBuffer();
    const image = await pdf.embedPng(piece);
    addImagePage(pdf, image, index === sliceCount - 1 && pieceH < pagePixelH * 0.98 ? "top" : "center");
  }
  console.log(shot.label, `${sliceCount} pages (overflow ${overflow.toFixed(2)})`);
}

const bytes = await pdf.save();
await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, bytes);
console.log("wrote", OUT, bytes.length);
