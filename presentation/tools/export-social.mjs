#!/usr/bin/env node
/**
 * Generate and validate platform-ready social exports from presentation/index.html.
 *
 * Artifacts under presentation/exports/:
 *   linkedin/slide-NN.png   1080x1350  LinkedIn carousel (13)
 *   x/slide-NN.png          1600x900   X carousel (13)
 *   cover.png               1200x630   link preview / Discord embed
 *   mcp-sidebar-deck.pdf    1600x900 per page, one page per slide
 *
 * Usage:
 *   node presentation/tools/export-social.mjs          # render with headless Chrome
 *   node presentation/tools/export-social.mjs --check  # validate existing artifacts
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const exportsDir = join(root, "exports");
const deckUrl = `file://${join(root, "index.html")}`;
const check = process.argv.includes("--check");
const story = JSON.parse(readFileSync(join(root, "content.json"), "utf8"));
const chromeBin = process.env.CHROME_BIN ?? "google-chrome";

const FORMATS = [
  { name: "linkedin", width: 1080, height: 1350 },
  { name: "x", width: 1600, height: 900 },
];
const COVER = { width: 1200, height: 630 };
const PDF_NAME = "mcp-sidebar-deck.pdf";
const slideNames = story.slides.map((_, index) => `slide-${String(index + 1).padStart(2, "0")}.png`);

function chrome(args) {
  const result = spawnSync(
    chromeBin,
    ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", "--virtual-time-budget=3000", ...args],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }
}

function pngSize(path) {
  const bytes = readFileSync(path);
  if (bytes.length < 24 || bytes.readUInt32BE(12) !== 0x49484452) {
    throw new Error(`${path} is not a valid PNG`);
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function pdfPageCount(path) {
  const raw = readFileSync(path).toString("latin1");
  if (!raw.startsWith("%PDF-")) throw new Error(`${path} is not a PDF`);
  const pageObjects = (raw.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  if (pageObjects > 0) return pageObjects;
  const count = raw.match(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/);
  return count ? Number(count[1]) : 0;
}

function validate() {
  const problems = [];
  for (const format of FORMATS) {
    const files = readdirSync(join(exportsDir, format.name)).filter((name) => name.endsWith(".png")).sort();
    if (files.join(",") !== slideNames.join(",")) {
      problems.push(`${format.name}: expected ${slideNames.length} slide PNGs, found [${files.join(", ")}]`);
      continue;
    }
    for (const name of files) {
      const size = pngSize(join(exportsDir, format.name, name));
      if (size.width !== format.width || size.height !== format.height) {
        problems.push(`${format.name}/${name}: expected ${format.width}x${format.height}, got ${size.width}x${size.height}`);
      }
    }
  }
  try {
    const cover = pngSize(join(exportsDir, "cover.png"));
    if (cover.width !== COVER.width || cover.height !== COVER.height) {
      problems.push(`cover.png: expected ${COVER.width}x${COVER.height}, got ${cover.width}x${cover.height}`);
    }
  } catch (error) {
    problems.push(String(error));
  }
  try {
    const pages = pdfPageCount(join(exportsDir, PDF_NAME));
    if (pages !== story.slides.length) {
      problems.push(`${PDF_NAME}: expected ${story.slides.length} pages, got ${pages}`);
    }
  } catch (error) {
    problems.push(String(error));
  }

  if (problems.length > 0) {
    for (const problem of problems) console.error(`- ${problem}`);
    process.exit(1);
  }
  console.log(`exports OK: ${slideNames.length} linkedin, ${slideNames.length} x, cover, ${PDF_NAME} (${story.slides.length} pages)`);
}

function render() {
  for (const format of FORMATS) {
    mkdirSync(join(exportsDir, format.name), { recursive: true });
    story.slides.forEach((_, index) => {
      const name = slideNames[index];
      const out = join(exportsDir, format.name, name);
      chrome([
        `--window-size=${format.width},${format.height}`,
        `--screenshot=${out}`,
        `${deckUrl}?export=${format.name}&slide=${index + 1}`,
      ]);
      console.log(`rendered ${format.name}/${name}`);
    });
  }
  chrome([
    `--window-size=${COVER.width},${COVER.height}`,
    `--screenshot=${join(exportsDir, "cover.png")}`,
    `${deckUrl}?export=cover&slide=1`,
  ]);
  console.log("rendered cover.png");
  chrome(["--no-pdf-header-footer", `--print-to-pdf=${join(exportsDir, PDF_NAME)}`, deckUrl]);
  console.log(`rendered ${PDF_NAME}`);
  writeFileSync(
    join(exportsDir, "manifest.json"),
    `${JSON.stringify(
      {
        source: "presentation/index.html",
        slides: story.slides.map((slide, index) => ({ index: index + 1, id: slide.id })),
        formats: FORMATS,
        cover: COVER,
        pdf: PDF_NAME,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  validate();
}

if (check) {
  validate();
} else {
  render();
}
