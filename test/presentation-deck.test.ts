import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const story = JSON.parse(
  await readFile(new URL("../presentation/content.json", import.meta.url), "utf8"),
) as {
  slides: Array<{ id: string; asset?: string }>;
};
const deck = await readFile(new URL("../presentation/index.html", import.meta.url), "utf8").catch(() => "");

test("generates one self-contained Spanish deck with embedded captures", () => {
  assert.ok(deck, "presentation/index.html must exist");
  assert.match(deck, /<html lang="es">/);
  assert.match(deck, /Lucas M\. Sastre/);
  assert.match(deck, /MCP Sidebar/);
  assert.doesNotMatch(deck, /<script\s+src=/, "deck must inline its JavaScript");
  assert.doesNotMatch(deck, /<link\s+rel="stylesheet"/, "deck must inline its styles");
  const images = deck.match(/data:image\/(?:png|webp);base64,/g) ?? [];
  assert.ok(images.length >= 4, `expected 4 embedded captures, found ${images.length}`);
});

test("keeps the deck under the Gist API truncation budget", () => {
  assert.ok(deck, "presentation/index.html must exist");
  const bytes = Buffer.byteLength(deck, "utf8");
  // GitHub's Gist API truncates file content above ~1MB and Gist Preview writes
  // that content verbatim: a truncated deck loses its navigation <script>.
  assert.ok(
    bytes < 800_000,
    `presentation/index.html must stay under 800 KB so Gist Preview receives it complete (got ${bytes} bytes)`,
  );
});

test("renders every story slide in order with its recreated capture", () => {
  let cursor = -1;
  for (const slide of story.slides) {
    const at = deck.indexOf(`data-slide="${slide.id}"`, cursor + 1);
    assert.ok(at > cursor, `missing or out-of-order slide: ${slide.id}`);
    cursor = at;
    if (slide.asset) {
      assert.match(
        deck,
        new RegExp(`data-asset="${slide.id}"`),
        `slide ${slide.id} must embed ${slide.asset}`,
      );
    }
  }
  assert.equal((deck.match(/data-slide="/g) ?? []).length, story.slides.length);
});

test("provides keyboard, touch, hash, fullscreen, progress and counter navigation", () => {
  for (const key of ["ArrowRight", "ArrowLeft", "PageDown", "PageUp", "Home", "End"]) {
    assert.ok(deck.includes(key), `keyboard handler missing ${key}`);
  }
  assert.match(deck, /aria-label="Anterior"/);
  assert.match(deck, /aria-label="Siguiente"/);
  assert.match(deck, /id="progress"/);
  assert.match(deck, /id="counter"/);
  assert.match(deck, /location\.hash/);
  assert.match(deck, /requestFullscreen|fullscreenElement/);
});

test("prints one slide per page and respects motion preferences and labels", () => {
  assert.match(deck, /@media print/);
  assert.match(deck, /@page/);
  assert.match(deck, /page-break-after:\s*always/);
  assert.match(deck, /prefers-reduced-motion/);
  assert.match(deck, /aria-label="Navegación"/);
});

test("exposes deterministic social export modes and a reproducible build", () => {
  for (const format of ["export-linkedin", "export-x", "export-cover"]) {
    assert.ok(deck.includes(format), `missing export format ${format}`);
  }
  for (const dim of ["1080", "1350", "1600", "900", "1200", "630"]) {
    assert.ok(deck.includes(dim), `missing export dimension ${dim}`);
  }
  assert.match(deck, /URLSearchParams/);

  const check = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("../presentation/tools/build-deck.mjs", import.meta.url)), "--check"],
    { encoding: "utf8" },
  );
  assert.equal(check.status, 0, `build --check failed:\n${check.stderr || check.stdout}`);
});
