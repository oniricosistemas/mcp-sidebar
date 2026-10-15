import { truncateToWidth, visibleWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";

import type { McpToolDetail } from "./mcp-view-model.ts";

export type ToolDetailsTone = "accent" | "border" | "dim" | "text" | "title";
export type ToolDetailsPaint = (text: string, tone?: ToolDetailsTone) => string;

function row(content: string, width: number, paint: ToolDetailsPaint): string {
  const innerWidth = Math.max(0, width - 4);
  const clipped = truncateToWidth(content, innerWidth);
  const padding = " ".repeat(Math.max(0, innerWidth - visibleWidth(clipped)));
  return `${paint("│", "border")} ${clipped}${padding} ${paint("│", "border")}`;
}

function frameTitle(label: string, width: number, paint: ToolDetailsPaint): string {
  const title = truncateToWidth(`MCP · ${label}`, Math.max(0, width - 5));
  const prefix = "╭─ ";
  const tailWidth = Math.max(0, width - visibleWidth(prefix) - visibleWidth(title) - 2);
  return `${paint(prefix, "border")}${paint(title, "title")}${paint(
    ` ${"─".repeat(tailWidth)}╮`,
    "border",
  )}`;
}

export function renderToolDetailsLines(
  namespaceLabel: string,
  tools: readonly McpToolDetail[],
  width: number,
  height: number,
  scrollOffset: number,
  paint: ToolDetailsPaint,
): string[] {
  const safeWidth = Math.max(24, width);
  const safeHeight = Math.max(6, height);
  const innerWidth = safeWidth - 4;
  const body: string[] = [];

  if (tools.length === 0) {
    body.push(paint("No registered tools available.", "dim"));
  } else {
    for (const tool of tools) {
      body.push(paint(tool.name, "accent"));
      for (const line of wrapTextWithAnsi(tool.description, Math.max(1, innerWidth - 2))) {
        body.push(`  ${paint(line, "dim")}`);
      }
      body.push("");
    }
    if (body.at(-1) === "") body.pop();
  }

  const bodyHeight = safeHeight - 4;
  const maxOffset = Math.max(0, body.length - bodyHeight);
  const offset = Math.min(Math.max(0, scrollOffset), maxOffset);
  const visibleBody = body.slice(offset, offset + bodyHeight);
  while (visibleBody.length < bodyHeight) visibleBody.push("");

  return [
    frameTitle(namespaceLabel, safeWidth, paint),
    row(
      paint(
        `${tools.length} ${tools.length === 1 ? "tool" : "tools"} · status unknown`,
        "dim",
      ),
      safeWidth,
      paint,
    ),
    ...visibleBody.map((line) => row(line, safeWidth, paint)),
    row(paint("↑/↓ scroll · esc close", "dim"), safeWidth, paint),
    paint(`╰${"─".repeat(Math.max(0, safeWidth - 2))}╯`, "border"),
  ];
}
