#!/usr/bin/env node
/**
 * Build the MCP Sidebar social presentation from presentation/content.json.
 *
 * Output: presentation/index.html — one self-contained HTML file with inline
 * CSS/JS and embedded PNG captures, ready for Gist Preview or GitHub Pages.
 *
 * Usage:
 *   node presentation/tools/build-deck.mjs          # write index.html
 *   node presentation/tools/build-deck.mjs --check  # verify index.html is current
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const check = process.argv.includes("--check");
const story = JSON.parse(readFileSync(join(root, "content.json"), "utf8"));

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Minimal inline markup: `code`, **bold**, bare github links. */
function inline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(
      /(github\.com\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+)/g,
      '<a class="pink" href="https://$1">$1</a>',
    );
}

function embedAsset(relativePath) {
  const bytes = readFileSync(join(root, relativePath));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

const assetCache = new Map();
function assetDataUri(slide) {
  if (!slide.asset) return null;
  if (!assetCache.has(slide.asset)) assetCache.set(slide.asset, embedAsset(slide.asset));
  return assetCache.get(slide.asset);
}

function renderEvidence(slide) {
  if (!slide.evidence?.length) return "";
  const items = slide.evidence.map((item) => `<li>${inline(item)}</li>`).join("");
  return `<ul class="evidence" aria-label="Evidencia">${items}</ul>`;
}

function renderPointsList(points) {
  return `<ul class="clean">${points.map((point) => `<li>${inline(point)}</li>`).join("")}</ul>`;
}

function renderGrid(slide) {
  const columns = Number(slide.layout.split("-")[1]) || 2;
  const cards = slide.points
    .map((point) => `<article class="card"><p>${inline(point)}</p></article>`)
    .join("");
  return `<div class="grid" style="--cols:${columns}">${cards}</div>`;
}

function renderHeading(slide, index) {
  const level = index === 0 ? "h1" : "h2";
  return `<${level}>${inline(slide.title)}</${level}>`;
}

function renderSplit(slide, index) {
  const dataUri = assetDataUri(slide);
  const visual = dataUri
    ? `<figure class="shot"><img data-asset="${slide.id}" src="${dataUri}" alt="Captura de ${escapeHtml(slide.title)}"></figure>`
    : `<figure class="shot"><pre class="term">$ ${inline(slide.points[0] ?? "")}</pre></figure>`;
  return `<div class="split"><div class="split-text">${renderHeading(slide, index)}${renderPointsList(slide.points)}</div>${visual}</div>`;
}

function renderBars(slide) {
  if (slide.chart?.bars?.length) {
    const max = slide.chart.max ?? Math.max(...slide.chart.bars.map((bar) => bar.value));
    const rows = slide.chart.bars
      .map((bar) => {
        const width = Math.max(2, Math.round((bar.value / max) * 100));
        return [
          `<div class="bar-row">`,
          `  <div class="bar-label">${inline(bar.label)}</div>`,
          `  <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>`,
          `  <div class="bar-value">${bar.value}</div>`,
          `</div>`,
        ].join("");
      })
      .join("");
    return `<div class="bars">${slide.chart.label ? `<p class="bar-caption">${inline(slide.chart.label)}</p>` : ""}${rows}</div>`;
  }
  return renderPointsList(slide.points);
}

function renderCover(slide) {
  const [lead, ...rest] = slide.points;
  return `<p class="lead">${inline(lead ?? "")}</p>${rest.length ? renderPointsList(rest) : ""}`;
}

function renderBody(slide, index) {
  switch (slide.layout) {
    case "cover": return `${renderHeading(slide, index)}${renderCover(slide)}`;
    case "split": return renderSplit(slide, index);
    case "bars": return `${renderHeading(slide, index)}${renderBars(slide)}`;
    default: return `${renderHeading(slide, index)}${renderGrid(slide)}`;
  }
}

const slidesHtml = story.slides
  .map((slide, index) => {
    return [
      `<section class="slide${index === 0 ? " active" : ""}" data-slide="${slide.id}" data-layout="${slide.layout}"${index === 0 ? ' data-initial="true"' : ""}>`,
      `  <div class="kicker">${inline(slide.kicker)}</div>`,
      `  <div class="slide-body">${renderBody(slide, index)}</div>`,
      renderEvidence(slide),
      `</section>`,
    ].join("\n");
  })
  .join("\n\n");

const colors = story.visual.colors;
const css = `
  :root {
    --bg: ${colors.background}; --panel: ${colors.panel}; --user: ${colors.user};
    --border: ${colors.border}; --border-subtle: ${colors.borderSubtle};
    --text: ${colors.text}; --muted: ${colors.muted}; --dim: ${colors.dim};
    --accent: ${colors.accent}; --gold: ${colors.gold}; --mint: ${colors.mint};
    --blue: ${colors.blue}; --error: ${colors.error};
    --sans: "Inter", "SF Pro Display", -apple-system, "Segoe UI", system-ui, sans-serif;
    --mono: "JetBrains Mono", "Iosevka", "SF Mono", ui-monospace, Menlo, monospace;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: var(--bg); color: var(--text); font-family: var(--sans); overflow: hidden; }
  .deck { position: relative; width: 100vw; height: 100vh; height: 100dvh; }
  .slide {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; justify-content: flex-start;
    overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain;
    padding: 6vh 7vw 8vh;
    opacity: 0; pointer-events: none; transform: translateY(14px) scale(.99);
    transition: opacity .45s ease, transform .45s ease;
    background:
      radial-gradient(1200px 600px at 110% -10%, rgba(240,149,200,.13), transparent 60%),
      radial-gradient(900px 500px at -10% 120%, rgba(169,199,238,.08), transparent 60%),
      var(--bg);
    scrollbar-width: thin; scrollbar-color: var(--border) transparent;
  }
  .slide.active { opacity: 1; pointer-events: auto; transform: none; }
  .slide::before { content: ""; margin-top: auto; }
  .slide::after { content: ""; margin-bottom: auto; }
  .slide > * { flex-shrink: 0; }

  .kicker { font-family: var(--mono); font-size: 1.05rem; letter-spacing: .18em; text-transform: uppercase; color: var(--accent); margin-bottom: 1.4vh; }
  .kicker::before { content: "✿ "; color: var(--gold); }
  h1 { font-size: clamp(2.6rem, 6vw, 5.6rem); line-height: 1.02; font-weight: 800; letter-spacing: -.03em; }
  h2 { font-size: clamp(2rem, 3.6vw, 3.4rem); line-height: 1.08; font-weight: 750; letter-spacing: -.02em; margin-bottom: 3.5vh; max-width: 22ch; }
  p, li { font-size: clamp(1.05rem, 1.45vw, 1.45rem); line-height: 1.5; color: var(--text); }
  .lead { font-size: clamp(1.25rem, 1.9vw, 1.8rem); color: var(--muted); max-width: 62ch; margin-top: 2.4vh; }
  .pink { color: var(--accent); } .gold { color: var(--gold); } .mint { color: var(--mint); }
  a { color: var(--accent); text-decoration: none; border-bottom: 1px solid var(--border); }
  code { font-family: var(--mono); background: var(--user); color: var(--gold); padding: .1em .4em; border-radius: 6px; font-size: .9em; }
  ul.clean { list-style: none; display: grid; gap: 1.4vh; margin-top: 2.6vh; max-width: 72ch; }
  ul.clean li { padding-left: 1.6em; position: relative; }
  ul.clean li::before { content: "❀"; position: absolute; left: 0; color: var(--accent); }
  .evidence { list-style: none; margin-top: 3vh; display: grid; gap: .8vh; max-width: 84ch; }
  .evidence li { font-family: var(--mono); font-size: clamp(.82rem, 1vw, 1rem); color: var(--dim); padding-left: 1.4em; position: relative; }
  .evidence li::before { content: "▸"; position: absolute; left: 0; color: var(--gold); }

  .grid { display: grid; grid-template-columns: repeat(var(--cols, 2), 1fr); gap: 2vw; margin-top: 1vh; }
  .card {
    background: linear-gradient(180deg, rgba(42,21,35,.55), rgba(16,10,15,.9));
    border: 1px solid var(--border-subtle); border-radius: 18px; padding: 2.6vh 1.6vw;
    box-shadow: 0 0 0 1px rgba(240,149,200,.04), 0 18px 40px -24px rgba(240,149,200,.35);
  }
  .card p { font-size: clamp(.95rem, 1.2vw, 1.2rem); }

  .split { display: grid; grid-template-columns: 5fr 7fr; gap: 3.5vw; align-items: center; margin-top: 1vh; }
  .split-text h2 { margin-bottom: 2.4vh; max-width: 14ch; }
  .split-text ul.clean { margin-top: 0; }
  .shot {
    background: var(--panel); border: 1px solid var(--border); border-radius: 14px; overflow: hidden;
    box-shadow: 0 30px 60px -30px rgba(240,149,200,.4);
  }
  .shot img { display: block; width: 100%; height: auto; }
  .term { font-family: var(--mono); padding: 2vh 1.2vw; color: var(--mint); font-size: clamp(.85rem, 1.1vw, 1.1rem); white-space: pre-wrap; }

  .bars { display: grid; gap: 2.2vh; margin-top: 2vh; }
  .bar-caption { font-family: var(--mono); color: var(--gold); font-size: clamp(.9rem, 1.1vw, 1.1rem); margin-bottom: 1vh; }
  .bar-row { display: grid; grid-template-columns: 18ch 1fr 7ch; gap: 1.6vw; align-items: center; }
  .bar-track { background: var(--panel); border: 1px solid var(--border-subtle); border-radius: 10px; height: 3.6vh; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 10px; background: linear-gradient(90deg, var(--accent), var(--gold)); }
  .bar-label { font-family: var(--mono); color: var(--text); font-size: clamp(.85rem, 1.05vw, 1.05rem); }
  .bar-value { font-family: var(--mono); color: var(--gold); font-size: clamp(.85rem, 1.05vw, 1.05rem); text-align: right; }

  .progress { position: fixed; left: 0; bottom: 0; height: 4px; background: linear-gradient(90deg, var(--accent), var(--gold)); transition: width .35s ease; z-index: 10; }
  .counter { position: fixed; right: 2vw; bottom: 2vh; font-family: var(--mono); color: var(--dim); font-size: .95rem; z-index: 10; }
  .brand { position: fixed; left: 2vw; bottom: 2vh; font-family: var(--mono); color: var(--dim); font-size: .95rem; z-index: 10; }
  .brand b { color: var(--accent); font-weight: 600; }
  .hint { position: fixed; top: 2vh; right: 2vw; font-family: var(--mono); color: var(--dim); font-size: .8rem; z-index: 10; transition: opacity 1s; }
  .touch-nav { display: none; }

  @media (hover: none) and (pointer: coarse) {
    .hint { display: none; }
    .touch-nav { display: flex; gap: 10px; position: fixed; left: 50%; bottom: 10px; transform: translateX(-50%); z-index: 11; }
    .touch-nav button {
      width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--border);
      background: rgba(16,10,15,.88); color: var(--accent); font: 600 1.5rem/1 var(--sans);
      display: grid; place-items: center; cursor: pointer; -webkit-tap-highlight-color: transparent;
    }
    .touch-nav button:active { background: var(--user); }
    .touch-nav button:disabled { opacity: .35; }
  }

  @media (prefers-reduced-motion: reduce) {
    .slide { transition: none; }
  }

  @media screen and (max-width: 820px), screen and (orientation: portrait) and (max-width: 1024px), screen and (max-height: 560px) {
    .slide { padding: 1.6rem 1.15rem 5.5rem; overflow-wrap: break-word; }
    .kicker { font-size: .8rem; letter-spacing: .12em; margin-bottom: .8rem; }
    h1 { font-size: clamp(2rem, 9vw, 3.2rem); }
    h2 { font-size: clamp(1.55rem, 6.6vw, 2.3rem); margin-bottom: 1.2rem; max-width: none; }
    p, li { font-size: 1rem; }
    .lead { font-size: 1.12rem; margin-top: 1.2rem; }
    ul.clean { gap: .7rem; margin-top: 1.2rem; }
    .grid, .split { grid-template-columns: 1fr; gap: .9rem; }
    .card { padding: 1rem 1.1rem; border-radius: 14px; }
    .bar-row { grid-template-columns: 1fr auto; gap: .5rem .8rem; }
    .bar-row .bar-value { text-align: right; }
    .bar-track { height: 1.4rem; grid-column: 1 / -1; }
    .hint { display: none; }
    .counter {
      background: rgba(16, 10, 15, .88); border: 1px solid var(--border-subtle);
      padding: .25em .7em; border-radius: 999px;
    }
    .brand { display: none; }
  }

  /* Social export modes: deterministic slide-sized canvases. */
  body.export-linkedin .deck { width: 1080px; height: 1350px; margin: 0 auto; }
  body.export-x .deck { width: 1600px; height: 900px; margin: 0 auto; }
  body.export-cover .deck { width: 1200px; height: 630px; margin: 0 auto; }
  body[class*="export-"] { overflow: hidden; }
  body[class*="export-"] .progress, body[class*="export-"] .counter,
  body[class*="export-"] .brand, body[class*="export-"] .hint,
  body[class*="export-"] .touch-nav { display: none; }
  body[class*="export-"] .slide { padding: 7vh 6vw; }
  body.export-linkedin .slide { padding: 90px 72px; }
  body.export-x .slide { padding: 64px 80px; }
  body.export-cover .slide { padding: 56px 64px; }

  @media print {
    @page { size: 1600px 900px; margin: 0; }
    html, body { overflow: visible; height: auto; }
    .deck { height: auto; width: auto; }
    .slide {
      position: relative; width: 1600px; height: 900px;
      opacity: 1; transform: none; overflow: hidden;
      page-break-after: always; break-after: page;
    }
    .progress, .counter, .brand, .hint, .touch-nav { display: none; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

const js = `
  const slides = [...document.querySelectorAll('.slide')];
  const counter = document.getElementById('counter');
  const progress = document.getElementById('progress');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const params = new URLSearchParams(location.search);
  const exportFormat = params.get('export');
  let i = Math.min(Math.max(parseInt(location.hash.slice(1), 10) - 1 || 0, 0), slides.length - 1);

  function show(n) {
    i = Math.min(Math.max(n, 0), slides.length - 1);
    slides.forEach((s, k) => s.classList.toggle('active', k === i));
    slides[i].scrollTop = 0;
    if (prevBtn) prevBtn.disabled = i === 0;
    if (nextBtn) nextBtn.disabled = i === slides.length - 1;
    counter.textContent = (i + 1) + ' / ' + slides.length;
    progress.style.width = (((i + 1) / slides.length) * 100) + '%';
    history.replaceState(null, '', '#' + (i + 1));
  }

  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('button')) return;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); show(i + 1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); show(i - 1); }
    else if (e.key === 'Home') show(0);
    else if (e.key === 'End') show(slides.length - 1);
    else if (e.key.toLowerCase() === 'f') {
      e.preventDefault();
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    }
    else if (e.key.toLowerCase() === 'p') { e.preventDefault(); window.print(); }
  });

  window.addEventListener('hashchange', () => {
    const n = parseInt(location.hash.slice(1), 10);
    if (!Number.isNaN(n)) show(n - 1);
  });

  if (prevBtn) prevBtn.addEventListener('click', () => show(i - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => show(i + 1));

  if (exportFormat) {
    document.body.classList.add('export-' + exportFormat);
    const wanted = parseInt(params.get('slide') || '1', 10);
    if (!Number.isNaN(wanted)) show(wanted - 1);
  } else {
    show(i);
  }
`;

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="author" content="${story.meta.author}">
<meta name="description" content="${escapeHtml(story.meta.title)} — ${escapeHtml(story.visual.direction)}">
<title>${escapeHtml(story.meta.title)}</title>
<style>${css}</style>
</head>
<body>
<div class="deck">

${slidesHtml}

</div>

<div class="brand"><b>mcp-sidebar</b> · ${escapeHtml(story.meta.author)} · ${escapeHtml(story.meta.ecosystem)}</div>
<div class="counter" id="counter"></div>
<div class="progress" id="progress"></div>
<div class="hint" id="hint">← → navegar · F pantalla completa · P exportar PDF</div>
<nav class="touch-nav" aria-label="Navegación">
  <button type="button" id="prev" aria-label="Anterior">‹</button>
  <button type="button" id="next" aria-label="Siguiente">›</button>
</nav>

<script>${js}</script>
</body>
</html>
`;

const outputPath = join(root, "index.html");
if (check) {
  let current = null;
  try {
    current = readFileSync(outputPath, "utf8");
  } catch {
    console.error("presentation/index.html is missing; run: node presentation/tools/build-deck.mjs");
    process.exit(1);
  }
  if (current !== html) {
    console.error("presentation/index.html is stale; run: node presentation/tools/build-deck.mjs");
    process.exit(1);
  }
  console.log("presentation/index.html is up to date");
} else {
  writeFileSync(outputPath, html, "utf8");
  console.log(`wrote ${outputPath} (${html.length} bytes)`);
}
