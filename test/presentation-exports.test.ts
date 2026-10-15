import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const exportsRoot = new URL("../presentation/exports/", import.meta.url);
const copyRoot = new URL("../presentation/copy/", import.meta.url);
const story = JSON.parse(
  await readFile(new URL("../presentation/content.json", import.meta.url), "utf8"),
) as { slides: unknown[] };

async function pngSize(url: URL): Promise<{ width: number; height: number }> {
  const bytes = await readFile(url);
  assert.equal(bytes.readUInt32BE(12), 0x49484452, `${url.pathname} is not a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const slideNames = story.slides.map((_, index) => `slide-${String(index + 1).padStart(2, "0")}.png`);

async function assertCarousel(directory: string, width: number, height: number) {
  const files = (await readdir(new URL(`${directory}/`, exportsRoot)).catch(() => [])).sort();
  assert.deepEqual(files, slideNames, `${directory} carousel must contain one PNG per slide`);
  for (const name of files) {
    assert.deepEqual(await pngSize(new URL(`${directory}/${name}`, exportsRoot)), { width, height });
  }
}

test("exports LinkedIn and X carousels at platform dimensions", async () => {
  await assertCarousel("linkedin", 1080, 1350);
  await assertCarousel("x", 1600, 900);
});

test("exports a cover card and one PDF page per slide", async () => {
  assert.deepEqual(await pngSize(new URL("cover.png", exportsRoot)), { width: 1200, height: 630 });

  const pdf = await readFile(new URL("mcp-sidebar-deck.pdf", exportsRoot)).catch(() => null);
  assert.ok(pdf, "presentation/exports/mcp-sidebar-deck.pdf must exist");
  assert.equal(pdf.subarray(0, 5).toString("latin1"), "%PDF-");
  const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  assert.equal(pages, story.slides.length, "PDF must have one page per slide");
});

test("writes Spanish copy within each platform's limits", async () => {
  const linkedin = await readFile(new URL("linkedin.md", copyRoot), "utf8").catch(() => "");
  const x = await readFile(new URL("x.md", copyRoot), "utf8").catch(() => "");
  const discord = await readFile(new URL("discord.md", copyRoot), "utf8").catch(() => "");

  assert.ok(linkedin.length >= 500 && linkedin.length <= 3000, `LinkedIn post must be 500-3000 chars, got ${linkedin.length}`);
  assert.ok(discord.length >= 200 && discord.length <= 2000, `Discord message must be 200-2000 chars, got ${discord.length}`);

  const posts = x.split(/\n-{3,}\n/).map((post) => post.trim()).filter(Boolean);
  assert.ok(posts.length >= 4, `X thread needs at least 4 posts, found ${posts.length}`);
  for (const [index, post] of posts.entries()) {
    assert.ok(post.length > 0 && post.length <= 280, `X post ${index + 1} must be 1-280 chars, got ${post.length}`);
  }
  assert.match(posts.at(-1) ?? "", /github\.com\/oniricosistemas\/mcp-sidebar/, "X thread must end with the repository link");

  for (const [name, text] of [["linkedin", linkedin], ["discord", discord]] as const) {
    assert.match(text, /github\.com\/oniricosistemas\/mcp-sidebar/, `${name} copy must link the repository`);
    assert.match(text, /\/mcp\b/, `${name} copy must keep the /mcp honesty boundary`);
    assert.match(text, /constru|verific/i, `${name} copy must speak about building and verifying`);
  }
});

test("keeps copy honest about MCP connectivity", async () => {
  for (const name of ["linkedin", "x", "discord"]) {
    const text = await readFile(new URL(`${name}.md`, copyRoot), "utf8").catch(() => "");
    assert.doesNotMatch(text, /conectad[oa]s?/i, `${name} copy must not claim MCP servers are connected`);
    assert.doesNotMatch(text, /servers? (online|activos|en línea)/i, `${name} copy must not claim server liveness`);
  }
});

test("exposes a reproducible export tool that validates artifacts", () => {
  const tool = fileURLToPath(new URL("../presentation/tools/export-social.mjs", import.meta.url));
  const source = spawnSync(process.execPath, [tool, "--check"], { encoding: "utf8" });
  assert.equal(source.status, 0, `export-social.mjs --check failed:\n${source.stderr || source.stdout}`);
});
