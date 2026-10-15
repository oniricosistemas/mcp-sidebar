import type { Theme } from "@earendil-works/pi-coding-agent";
import type {
  Component,
  TUI,
  TuiMouseEvent,
  TuiMouseEventResult,
} from "@earendil-works/pi-tui";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

import type { McpServerView } from "./mcp-view-model.ts";

export type SidebarTone = "border" | "dim" | "selected" | "success" | "text" | "title";
export type SidebarPaint = (text: string, tone?: SidebarTone) => string;

export interface SidebarLayout {
  lines: string[];
  rowIds: (string | undefined)[];
  collapseRows: boolean[];
}

const MAX_VISIBLE_SERVERS = 8;

function row(
  content: string,
  width: number,
  paint: SidebarPaint,
  selected = false,
): string {
  const innerWidth = Math.max(0, width - 4);
  const clipped = truncateToWidth(content, innerWidth);
  const padding = " ".repeat(Math.max(0, innerWidth - visibleWidth(clipped)));
  const inner = selected ? paint(`${clipped}${padding}`, "selected") : `${clipped}${padding}`;
  return `${paint("│", "border")} ${inner} ${paint("│", "border")}`;
}

function columns(left: string, right: string, width: number): string {
  const clippedRight = truncateToWidth(right, width);
  const rightWidth = visibleWidth(clippedRight);
  if (rightWidth >= width) return clippedRight;

  const clippedLeft = truncateToWidth(left, Math.max(0, width - rightWidth - 1));
  const gap = Math.max(1, width - visibleWidth(clippedLeft) - rightWidth);
  return truncateToWidth(`${clippedLeft}${" ".repeat(gap)}${clippedRight}`, width);
}

export function renderSidebarLayout(
  servers: readonly McpServerView[],
  width: number,
  paint: SidebarPaint,
  selectedId?: string,
  collapsed = false,
): SidebarLayout {
  const safeWidth = Math.max(20, width);
  const namespaceLabel = `${servers.length} ${servers.length === 1 ? "namespace" : "namespaces"}`;
  if (collapsed) {
    const leftLabel = safeWidth >= 34 ? "MCP servers ▸ Expand" : "MCP ▸ Expand";
    const rightLabel = safeWidth >= 48
      ? `${namespaceLabel} · ctrl+shift+m`
      : safeWidth >= 29
        ? namespaceLabel
        : `${servers.length} ns`;
    return {
      lines: [columns(paint(leftLabel, "title"), paint(rightLabel, "dim"), safeWidth)],
      rowIds: [undefined],
      collapseRows: [true],
    };
  }

  const title = safeWidth >= 27 ? "MCP servers ▾ Collapse" : "MCP ▾ Collapse";
  const titlePrefix = `╭─ ${title} `;
  const top = `${paint("╭─ ", "border")}${paint(title, "title")}${paint(
    ` ${"─".repeat(Math.max(0, safeWidth - visibleWidth(titlePrefix) - 1))}╮`,
    "border",
  )}`;
  const bottom = paint(`╰${"─".repeat(Math.max(0, safeWidth - 2))}╯`, "border");
  const innerWidth = safeWidth - 4;
  const lines = [
    top,
    row(paint("tools registered", "dim"), safeWidth, paint),
    row(paint("connection status: /mcp", "dim"), safeWidth, paint),
    row("", safeWidth, paint),
  ];
  const rowIds: (string | undefined)[] = [undefined, undefined, undefined, undefined];
  const collapseRows = [true, false, false, false];

  if (servers.length === 0) {
    lines.push(row(paint("No registered MCP tools yet", "dim"), safeWidth, paint));
    rowIds.push(undefined);
    collapseRows.push(false);
  } else {
    const visibleServers = servers.slice(0, MAX_VISIBLE_SERVERS);
    if (visibleServers.length < servers.length) {
      lines.push(
        row(
          paint(`Showing ${visibleServers.length} of ${servers.length} · /mcp`, "dim"),
          safeWidth,
          paint,
        ),
      );
      rowIds.push(undefined);
      collapseRows.push(false);
    }
    for (const server of visibleServers) {
      const toolLabel = `${server.toolCount} ${server.toolCount === 1 ? "tool" : "tools"}`;
      const left = `${paint("●", "success")} ${paint(server.label, "text")}`;
      lines.push(
        row(
          columns(left, paint(toolLabel, "dim"), innerWidth),
          safeWidth,
          paint,
          server.id === selectedId,
        ),
      );
      rowIds.push(server.id);
      collapseRows.push(false);
    }
  }

  lines.push(bottom);
  rowIds.push(undefined);
  collapseRows.push(false);
  return { lines, rowIds, collapseRows };
}

export function renderSidebarLines(
  servers: readonly McpServerView[],
  width: number,
  paint: SidebarPaint,
): string[] {
  return renderSidebarLayout(servers, width, paint).lines;
}

export class McpSidebar implements Component {
  private servers: readonly McpServerView[] = [];
  private readonly tui: TUI;
  private readonly theme: Theme;
  private readonly onOpenNamespace?: (namespaceId: string) => void;
  private readonly onCollapsedChange?: (collapsed: boolean) => void;
  private rowIds: (string | undefined)[] = [];
  private collapseRows: boolean[] = [];
  private selectedId: string | undefined;
  private collapsed = false;

  constructor(
    tui: TUI,
    theme: Theme,
    onOpenNamespace?: (namespaceId: string) => void,
    onCollapsedChange?: (collapsed: boolean) => void,
  ) {
    this.tui = tui;
    this.theme = theme;
    this.onOpenNamespace = onOpenNamespace;
    this.onCollapsedChange = onCollapsedChange;
  }

  setServers(servers: readonly McpServerView[]): void {
    this.servers = servers;
    this.rowIds = [];
    if (this.selectedId && !servers.some((server) => server.id === this.selectedId)) {
      this.selectedId = undefined;
    }
    this.invalidate();
    this.tui.requestRender();
  }

  setCollapsed(collapsed: boolean): void {
    if (this.collapsed === collapsed) return;
    this.collapsed = collapsed;
    this.selectedId = undefined;
    this.invalidate();
    this.tui.requestRender();
  }

  isCollapsed(): boolean {
    return this.collapsed;
  }

  digest(): string {
    return JSON.stringify([
      this.collapsed,
      this.servers.map((server) => [server.id, server.toolCount]),
    ]);
  }

  invalidate(): void {
    this.rowIds = [];
    this.collapseRows = [];
  }

  handleMouse(event: TuiMouseEvent): TuiMouseEventResult | undefined {
    if (event.x < 0 || event.x >= event.width || event.y < 0 || event.y >= event.height) {
      return undefined;
    }

    const collapseRow = this.collapseRows[event.y] === true;
    const namespaceId = this.rowIds[event.y];
    if (event.type === "move") {
      if (collapseRow) {
        const hadSelection = this.selectedId !== undefined;
        this.selectedId = undefined;
        if (hadSelection) this.tui.requestRender();
        return { handled: true, render: hadSelection };
      }
      if (namespaceId === this.selectedId) return namespaceId ? { handled: true, render: false } : undefined;
      const hadSelection = this.selectedId !== undefined;
      this.selectedId = namespaceId;
      if (namespaceId || hadSelection) {
        this.tui.requestRender();
        return { handled: true, render: true };
      }
      return undefined;
    }

    if (event.button !== "left") return undefined;
    if (collapseRow) {
      if (event.type === "press") return { handled: true, render: false };
      if (event.type !== "click") return undefined;
      this.setCollapsed(!this.collapsed);
      this.onCollapsedChange?.(this.collapsed);
      return { handled: true, render: true };
    }

    if (!namespaceId) return undefined;
    if (event.type === "press") return { handled: true, render: false };
    if (event.type !== "click") return undefined;

    this.onOpenNamespace?.(namespaceId);
    return { handled: true };
  }

  render(width: number): string[] {
    const layout = renderSidebarLayout(
      this.servers,
      width,
      (text, tone = "text") => {
        switch (tone) {
          case "title":
            return this.theme.fg("accent", this.theme.bold(text));
          case "border":
            return this.theme.fg("border", text);
          case "selected":
            return this.theme.style(text, { fg: "text", bg: "selectedBg" });
          default:
            return this.theme.fg(tone, text);
        }
      },
      this.selectedId,
      this.collapsed,
    );
    this.rowIds = layout.rowIds;
    this.collapseRows = layout.collapseRows;
    return layout.lines;
  }
}
