#!/usr/bin/env node
/**
 * Re-encode presentation captures as WebP so the single-file deck stays below
 * the GitHub Gist API content limit. Gist Preview writes the API's (truncated)
 * content verbatim, so a deck above ~1MB loses its navigation script.
 *
 * Source: presentation/assets/presentation/*.png   (canonical captures)
 * Output: presentation/assets/presentation/optimized/*.webp
 *
 * Usage: node presentation/tools/optimize-captures.mjs
 * Requires: google-chrome (or CHROME_BIN) for canvas re-encoding.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const sourceDir = join(root, "assets", "presentation");
const outputDir = join(sourceDir, "optimized");
const chromeBin = process.env.CHROME_BIN ?? "google-chrome";

const TARGET_WIDTH = 1200;
const QUALITY = 0.85;

mkdirSync(outputDir, { recursive: true });
const scratch = mkdtempSync(join(tmpdir(), "mcp-optimize-"));

try {
  const sources = readdirSync(sourceDir)
    .filter((name) => name.endsWith(".png"))
    .sort();
  if (sources.length === 0) throw new Error(`no PNG captures found in ${sourceDir}`);

  for (const name of sources) {
    const inputPath = join(sourceDir, name);
    const outputPath = join(outputDir, name.replace(/\.png$/, ".webp"));
    const pagePath = join(scratch, `${name}.html`);

    writeFileSync(
      pagePath,
      `<!doctype html><html><body><script>
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, ${TARGET_WIDTH} / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          document.body.innerHTML = '<pre id="out">' + canvas.toDataURL('image/webp', ${QUALITY}) + '</pre>';
        };
        img.onerror = () => { document.body.innerHTML = '<pre id="out">LOAD_ERROR</pre>'; };
        img.src = ${JSON.stringify(pathToFileURL(inputPath).href)};
      </script></body></html>`,
      "utf8",
    );

    const result = spawnSync(
      chromeBin,
      [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--allow-file-access-from-files",
        "--virtual-time-budget=8000",
        "--dump-dom",
        `file://${pagePath}`,
      ],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    if (result.status !== 0) {
      console.error(result.stderr || result.stdout);
      process.exit(1);
    }

    const match = result.stdout.match(/<pre id="out">(data:image\/webp;base64,[^<]+)<\/pre>/);
    if (!match) throw new Error(`no WebP data produced for ${name}`);
    const base64 = match[1].replace("data:image/webp;base64,", "");
    const bytes = Buffer.from(base64, "base64");
    writeFileSync(outputPath, bytes);

    const source = readFileSync(inputPath);
    console.log(`${name}: ${source.length} -> ${bytes.length} bytes (${outputPath.split("/").pop()})`);
  }

  console.log(`TARGET_WIDTH=${TARGET_WIDTH} QUALITY=${QUALITY}`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
