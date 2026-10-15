#!/usr/bin/env node
/**
 * Render a tmux ANSI capture into a PNG using headless Chrome.
 *
 * Usage:
 *   node presentation/tools/render-capture.mjs <capture.ansi> <output.png> [columns] [rows]
 *
 * The capture is produced with `tmux capture-pane -e -p -t <session>`.
 * Colors are expanded to RGB from the 256-color palette so the output does
 * not depend on terminal theme configuration.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const [capturePath, outputPath, columnsArg, rowsArg] = process.argv.slice(2);
if (!capturePath || !outputPath) {
  console.error("usage: render-capture.mjs <capture.ansi> <output.png> [columns] [rows]");
  process.exit(2);
}

const columns = Number(columnsArg ?? 140);
const rows = Number(rowsArg ?? 40);
const input = readFileSync(resolve(capturePath), "utf8");

const PALETTE = [
  "#060407", "#FF718F", "#B4E7C7", "#E0C27A", "#A9C7EE", "#F095C8", "#8FD3D6", "#F6EFF3",
  "#76616B", "#FF8DA6", "#CFF0DC", "#EAD39C", "#C3DBF5", "#FFB1DD", "#B4E2E4", "#FFFFFF",
];

function color256(index) {
  if (index < 16) return PALETTE[index];
  if (index < 232) {
    const value = index - 16;
    const steps = [0, 95, 135, 175, 215, 255];
    const r = steps[Math.floor(value / 36)];
    const g = steps[Math.floor((value % 36) / 6)];
    const b = steps[value % 6];
    return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  }
  const gray = 8 + (index - 232) * 10;
  return `#${[gray, gray, gray].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const segments = [];
let plain = "";
let style = {};
let fg = null;
let bg = null;
let bold = false;
let dim = false;
let inverse = false;

function flush() {
  if (!plain) return;
  const effectiveFg = inverse ? (bg ?? "#F6EFF3") : (fg ?? "#F6EFF3");
  const effectiveBg = inverse ? (fg ?? "#100A0F") : (bg ?? "#100A0F");
  const css = [
    `color:${effectiveFg}`,
    `background:${effectiveBg}`,
    bold ? "font-weight:700" : "",
    dim ? "opacity:.62" : "",
  ].filter(Boolean).join(";");
  segments.push(`<span style="${css}">${escapeHtml(plain)}</span>`);
  plain = "";
}

function applySgr(params) {
  if (params.length === 0) params = [0];
  for (let i = 0; i < params.length; i += 1) {
    const code = params[i];
    if (code === 0) {
      fg = null; bg = null; bold = false; dim = false; inverse = false;
    } else if (code === 1) bold = true;
    else if (code === 2) dim = true;
    else if (code === 7) inverse = true;
    else if (code === 22) { bold = false; dim = false; }
    else if (code === 27) inverse = false;
    else if (code === 39) fg = null;
    else if (code === 49) bg = null;
    else if (code >= 30 && code <= 37) fg = PALETTE[code - 30];
    else if (code >= 90 && code <= 97) fg = PALETTE[code - 90 + 8];
    else if (code >= 40 && code <= 47) bg = PALETTE[code - 40];
    else if (code >= 100 && code <= 107) bg = PALETTE[code - 100 + 8];
    else if (code === 38 || code === 48) {
      const mode = params[i + 1];
      let value = null;
      if (mode === 5) {
        value = color256(params[i + 2]);
        i += 2;
      } else if (mode === 2) {
        value = `#${[params[i + 2], params[i + 3], params[i + 4]]
          .map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
        i += 4;
      }
      if (code === 38) fg = value; else bg = value;
    }
  }
}

const sgrPattern = /\x1b\[([0-9;:]*)m/g;
let cursor = 0;
for (const match of input.matchAll(sgrPattern)) {
  if (match.index > cursor) plain += input.slice(cursor, match.index);
  flush();
  applySgr(match[1].split(";").filter((part) => part !== "").map(Number));
  cursor = match.index + match[0].length;
}
if (cursor < input.length) plain += input.slice(cursor);
flush();

const cellWidth = 10.25;
const cellHeight = 22;
const padX = 26;
const padY = 24;
const barHeight = 34;
const width = Math.round(columns * cellWidth + padX * 2);
const height = Math.round(rows * cellHeight + padY * 2 + barHeight);

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>MCP Sidebar capture</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${width}px; height: ${height}px;
    background: #060407;
    font-family: "JetBrains Mono", "Iosevka", "SF Mono", ui-monospace, Menlo, monospace;
  }
  .frame {
    width: 100%; height: 100%;
    background: linear-gradient(180deg, #150D12, #0A0609);
    border: 1px solid #2A1720;
    border-radius: 14px;
    padding: ${barHeight}px ${padX}px ${padY}px;
    overflow: hidden;
    position: relative;
  }
  .bar {
    position: absolute; top: 0; left: 0; right: 0; height: ${barHeight}px;
    background: #0B070A;
    border-bottom: 1px solid #2A1720;
    border-radius: 14px 14px 0 0;
    display: flex; align-items: center; gap: 8px; padding: 0 14px;
  }
  .bar i { width: 11px; height: 11px; border-radius: 50%; background: #563040; }
  .bar i:nth-child(1) { background: #FF718F; }
  .bar i:nth-child(2) { background: #F2B86D; }
  .bar i:nth-child(3) { background: #B4E7C7; }
  .bar span {
    margin-left: 12px; color: #76616B;
    font-family: ui-monospace, Menlo, monospace; font-size: 13px; letter-spacing: .04em;
  }
  pre {
    font-size: 16.5px;
    line-height: ${cellHeight}px;
    letter-spacing: 0;
    white-space: pre;
    color: #F6EFF3;
  }
</style>
</head>
<body>
<div class="frame">
  <div class="bar"><i></i><i></i><i></i><span>gentle-shell · mcp-sidebar</span></div>
  <pre>${segments.join("")}</pre>
</div>
</body>
</html>`;

const scratch = mkdtempSync(join(tmpdir(), "mcp-shot-"));
try {
  const htmlPath = join(scratch, "capture.html");
  writeFileSync(htmlPath, html, "utf8");
  const result = spawnSync("google-chrome", [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--hide-scrollbars",
    `--window-size=${width},${height}`,
    `--screenshot=${resolve(outputPath)}`,
    `file://${htmlPath}`,
  ], { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
