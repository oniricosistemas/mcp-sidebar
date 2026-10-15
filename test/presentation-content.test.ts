import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const storyPath = new URL("../presentation/content.json", import.meta.url);

interface PresentationStory {
  meta: {
    language: string;
    title: string;
    author: string;
    ecosystem: string;
    repository: string;
    audiences: string[];
    goals: string[];
  };
  visual: {
    direction: string;
    colors: Record<string, string>;
  };
  slides: Array<{
    id: string;
    kicker: string;
    title: string;
    purpose: string;
    layout: string;
    points: string[];
    evidence?: string[];
    asset?: string;
  }>;
}

async function loadStory(): Promise<PresentationStory> {
  return JSON.parse(await readFile(storyPath, "utf8")) as PresentationStory;
}

test("defines the Spanish MCP Sidebar social narrative and identity", async () => {
  const story = await loadStory();

  assert.equal(story.meta.language, "es");
  assert.equal(story.meta.author, "Lucas M. Sastre");
  assert.match(story.meta.ecosystem, /Gentle Shell|Pi/);
  assert.equal(story.meta.repository, "https://github.com/oniricosistemas/mcp-sidebar");
  assert.deepEqual(story.meta.audiences, [
    "Usuarios de Gentle Shell/Pi",
    "Desarrolladores de agentes",
    "Público técnico general",
  ]);
  assert.deepEqual(story.meta.goals, [
    "Mostrar el proceso de ingeniería",
    "Presentar MCP Sidebar como producto",
    "Posicionamiento personal/profesional",
  ]);
  assert.match(story.visual.direction, /MCP Sidebar.*Gentleman-Cute/i);

  for (const token of ["background", "panel", "text", "muted", "accent", "gold", "mint", "blue", "error"]) {
    assert.match(story.visual.colors[token] ?? "", /^#[0-9A-F]{6}$/i, `missing ${token} color`);
  }
});

test("orders thirteen focused slides from outcome through public CTA", async () => {
  const story = await loadStory();
  const expectedIds = [
    "cover",
    "problem",
    "constraints",
    "evolution",
    "tool-details",
    "theme",
    "native-rail",
    "collapse-responsive",
    "architecture",
    "verification",
    "delivery-chain",
    "result",
    "cta",
  ];

  assert.deepEqual(story.slides.map(({ id }) => id), expectedIds);
  assert.equal(new Set(expectedIds).size, story.slides.length);

  for (const slide of story.slides) {
    assert.ok(slide.kicker.trim(), `${slide.id} needs a kicker`);
    assert.ok(slide.title.trim(), `${slide.id} needs a title`);
    assert.ok(slide.purpose.trim(), `${slide.id} needs a purpose`);
    assert.ok(slide.layout.trim(), `${slide.id} needs a layout`);
    assert.ok(slide.points.length >= 1 && slide.points.length <= 4, `${slide.id} must stay cognitively bounded`);
  }

  assert.match(story.slides[0].title, /MCP Sidebar/i);
  assert.match(story.slides.at(-1)?.points.join(" ") ?? "", /github\.com\/oniricosistemas\/mcp-sidebar/);
});

test("anchors technical claims in observed project evidence", async () => {
  const story = await loadStory();
  const evidence = story.slides.flatMap((slide) => slide.evidence ?? []).join("\n");
  const copy = story.slides.flatMap((slide) => [slide.title, ...slide.points]).join("\n");

  assert.match(evidence, /22\/22/);
  assert.match(evidence, /1[.,]670/);
  assert.match(evidence, /390/);
  assert.match(evidence, /PR #6/);
  assert.match(evidence, /140.*120.*140/);
  assert.match(copy, /\/mcp/);
  assert.doesNotMatch(copy, /todos los MCP están conectados/i);

  const assetSlides = story.slides.filter(({ asset }) => asset);
  assert.deepEqual(
    assetSlides.map(({ id }) => id),
    ["evolution", "tool-details", "native-rail", "collapse-responsive"],
  );
});
