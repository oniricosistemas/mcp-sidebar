import type { Theme } from "@earendil-works/pi-coding-agent";
import type { Component, TUI } from "@earendil-works/pi-tui";
import {
  Key,
  matchesKey,
  truncateToWidth,
  visibleWidth,
  wrapTextWithAnsi,
} from "@earendil-works/pi-tui";

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

function buildBody(
  tools: readonly McpToolDetail[],
  innerWidth: number,
  paint: ToolDetailsPaint,
): string[] {
  const body: string[] = [];

  if (tools.length === 0) {
    return [paint("No registered tools available.", "dim")];
  }

  for (const tool of tools) {
    body.push(paint(tool.name, "accent"));
    for (const line of wrapTextWithAnsi(tool.description, Math.max(1, innerWidth - 2))) {
      body.push(`  ${paint(line, "dim")}`);
    }
    body.push("");
  }
  if (body.at(-1) === "") body.pop();
  return body;
}

export function getToolDetailsMaxScroll(
  tools: readonly McpToolDetail[],
  width: number,
  height: number,
): number {
  const safeWidth = Math.max(24, width);
  const safeHeight = Math.max(6, height);
  const body = buildBody(tools, safeWidth - 4, (text) => text);
  return Math.max(0, body.length - (safeHeight - 4));
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
  const body = buildBody(tools, safeWidth - 4, paint);
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

export class McpToolDetails implements Component {
  private scrollOffset = 0;
  private maxScroll = 0;
  private closed = false;
  private readonly tui: TUI;
  private readonly theme: Theme;
  private readonly namespaceLabel: string;
  private readonly tools: readonly McpToolDetail[];
  private readonly done: () => void;

  constructor(
    tui: TUI,
    theme: Theme,
    namespaceLabel: string,
    tools: readonly McpToolDetail[],
    done: () => void,
  ) {
    this.tui = tui;
    this.theme = theme;
    this.namespaceLabel = namespaceLabel;
    this.tools = tools;
    this.done = done;
  }

  invalidate(): void {}

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.done();
  }

  handleInput(data: string): void {
    if (matchesKey(data, Key.escape) || matchesKey(data, Key.ctrl("c"))) {
      this.close();
      return;
    }

    const previous = this.scrollOffset;
    if (matchesKey(data, Key.up)) this.scrollOffset = Math.max(0, this.scrollOffset - 1);
    if (matchesKey(data, Key.down)) {
      this.scrollOffset = Math.min(this.maxScroll, this.scrollOffset + 1);
    }
    if (matchesKey(data, Key.pageUp)) {
      this.scrollOffset = Math.max(0, this.scrollOffset - 5);
    }
    if (matchesKey(data, Key.pageDown)) {
      this.scrollOffset = Math.min(this.maxScroll, this.scrollOffset + 5);
    }
    if (this.scrollOffset !== previous) this.tui.requestRender();
  }

  render(width: number): string[] {
    const height = Math.max(6, Math.floor(this.tui.terminal.rows * 0.8));
    this.maxScroll = getToolDetailsMaxScroll(this.tools, width, height);
    this.scrollOffset = Math.min(this.scrollOffset, this.maxScroll);

    return renderToolDetailsLines(
      this.namespaceLabel,
      this.tools,
      width,
      height,
      this.scrollOffset,
      (text, tone = "text") => {
        switch (tone) {
          case "title":
            return this.theme.fg("accent", this.theme.bold(text));
          case "border":
            return this.theme.fg("borderAccent", text);
          default:
            return this.theme.fg(tone, text);
        }
      },
    );
  }
}
