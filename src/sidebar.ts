import type { Theme } from "@earendil-works/pi-coding-agent";
import type { Component, TUI } from "@earendil-works/pi-tui";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

import type { McpServerView } from "./mcp-view-model.ts";

type Tone = "accent" | "dim" | "success";
type Paint = (text: string, tone?: Tone) => string;

const MAX_VISIBLE_SERVERS = 8;

function row(content: string, width: number): string {
  const innerWidth = Math.max(0, width - 4);
  const clipped = truncateToWidth(content, innerWidth);
  const padding = " ".repeat(Math.max(0, innerWidth - visibleWidth(clipped)));
  return `│ ${clipped}${padding} │`;
}

function columns(left: string, right: string, width: number): string {
  const clippedRight = truncateToWidth(right, width);
  const rightWidth = visibleWidth(clippedRight);
  if (rightWidth >= width) return clippedRight;

  const clippedLeft = truncateToWidth(left, Math.max(0, width - rightWidth - 1));
  const gap = Math.max(1, width - visibleWidth(clippedLeft) - rightWidth);
  return truncateToWidth(`${clippedLeft}${" ".repeat(gap)}${clippedRight}`, width);
}

export function renderSidebarLines(
  servers: readonly McpServerView[],
  width: number,
  paint: Paint,
): string[] {
  const safeWidth = Math.max(20, width);
  const title = "╭─ MCP servers ";
  const top = `${title}${"─".repeat(Math.max(0, safeWidth - visibleWidth(title) - 1))}╮`;
  const bottom = `╰${"─".repeat(Math.max(0, safeWidth - 2))}╯`;
  const innerWidth = safeWidth - 4;
  const lines = [
    top,
    row(paint("status unknown · use /mcp", "dim"), safeWidth),
    row("", safeWidth),
  ];

  if (servers.length === 0) {
    lines.push(row(paint("No registered MCP tools yet", "dim"), safeWidth));
  } else {
    const visibleServers = servers.slice(0, MAX_VISIBLE_SERVERS);
    if (visibleServers.length < servers.length) {
      lines.push(
        row(
          paint(`Showing ${visibleServers.length} of ${servers.length} · /mcp`, "dim"),
          safeWidth,
        ),
      );
    }
    for (const server of visibleServers) {
      const toolLabel = `${server.toolCount} ${server.toolCount === 1 ? "tool" : "tools"}`;
      const left = `${paint("●", "success")} ${server.label}`;
      lines.push(row(columns(left, paint(toolLabel, "dim"), innerWidth), safeWidth));
    }
  }

  lines.push(bottom);
  return lines;
}

export class McpSidebar implements Component {
  private servers: readonly McpServerView[] = [];
  private readonly tui: TUI;
  private readonly theme: Theme;

  constructor(tui: TUI, theme: Theme) {
    this.tui = tui;
    this.theme = theme;
  }

  setServers(servers: readonly McpServerView[]): void {
    this.servers = servers;
    this.invalidate();
    this.tui.requestRender();
  }

  invalidate(): void {}

  render(width: number): string[] {
    return renderSidebarLines(this.servers, width, (text, tone = "accent") =>
      this.theme.fg(tone, text),
    );
  }
}
