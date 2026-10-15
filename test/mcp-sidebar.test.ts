import assert from "node:assert/strict";
import test from "node:test";

import { visibleWidth } from "@earendil-works/pi-tui";

import {
  buildMcpServers,
  buildMcpToolDetails,
  shouldShowSidebar,
  type ToolDescriptor,
} from "../src/mcp-view-model.ts";
import { McpToolDetails, renderToolDetailsLines } from "../src/tool-details.ts";
import { McpSidebar, renderSidebarLayout, renderSidebarLines } from "../src/sidebar.ts";

const tools: ToolDescriptor[] = [
  { name: "read", exposure: "direct" },
  {
    name: "mcp__context7__resolve_library_id",
    description: "Resolve a package to its Context7 library identifier.",
    exposure: "deferred",
    namespace: { name: "mcp__context7" },
  },
  {
    name: "mcp__context7__query_docs",
    description: "Query current library documentation.",
    exposure: "deferred",
    namespace: { name: "mcp__context7" },
  },
  {
    name: "mcp__chrome_devtools__navigate_page",
    exposure: "codemode",
    namespace: { name: "mcp__chrome_devtools" },
  },
  {
    name: "mcp__internal__delete_everything",
    exposure: "hidden",
    namespace: { name: "mcp__internal" },
  },
];

test("groups reachable MCP tools by namespace and reports honest availability", () => {
  assert.deepEqual(buildMcpServers(tools), [
    { id: "chrome_devtools", label: "chrome-devtools", toolCount: 1, availability: "available" },
    { id: "context7", label: "context7", toolCount: 2, availability: "available" },
  ]);
});

test("ignores hidden MCP tools and unrelated Pi tools", () => {
  assert.deepEqual(
    buildMcpServers([
      tools[0]!,
      tools[4]!,
      { name: "mcp__orphan", exposure: "direct" },
    ]),
    [],
  );
});

test("selects sorted namespace tool details with descriptions and safe fallbacks", () => {
  assert.deepEqual(
    buildMcpToolDetails(
      [
        tools[2]!,
        tools[1]!,
        { ...tools[1], description: "duplicate must not replace the first record" },
        {
          name: "mcp__context7__without_description",
          description: "   ",
          exposure: "codemode",
          namespace: { name: "mcp__context7" },
        },
        tools[4]!,
      ],
      "context7",
    ),
    [
      { name: "query_docs", description: "Query current library documentation." },
      {
        name: "resolve_library_id",
        description: "Resolve a package to its Context7 library identifier.",
      },
      { name: "without_description", description: "No description provided." },
    ],
  );
});

test("shows the sidebar only when the terminal can support a passive panel", () => {
  assert.equal(shouldShowSidebar(99), false);
  assert.equal(shouldShowSidebar(100), true);
});

test("renders a width-safe panel without claiming transport connectivity", () => {
  const lines = renderSidebarLines(buildMcpServers(tools), 30, (text) => text);

  assert.equal(lines[0], "╭─ MCP servers ──────────────╮");
  assert.ok(lines.some((line) => line.includes("context7") && line.includes("2 tools")));
  assert.ok(lines.some((line) => line.includes("tools registered")));
  assert.ok(lines.some((line) => line.includes("connection status: /mcp")));
  assert.ok(lines.every((line) => !line.includes("status unknown")));
  assert.ok(lines.every((line) => visibleWidth(line) <= 30));
});

test("preserves tool counts when a namespace label is wider than its row", () => {
  const lines = renderSidebarLines(
    [
      {
        id: "long",
        label: "a-very-long-mcp-namespace-that-cannot-fit",
        toolCount: 12,
        availability: "available",
      },
    ],
    32,
    (text) => text,
  );

  const serverLine = lines.find((line) => line.includes("12 tools"));
  assert.ok(serverLine);
  assert.ok(serverLine.includes("a-very"));
  assert.ok(lines.every((line) => visibleWidth(line) <= 32));
});

test("bounds large inventories and keeps the overflow path visible", () => {
  const servers = Array.from({ length: 12 }, (_, index) => ({
    id: `server-${index + 1}`,
    label: `server-${String(index + 1).padStart(2, "0")}`,
    toolCount: index + 1,
    availability: "available" as const,
  }));
  const lines = renderSidebarLines(servers, 32, (text) => text);

  assert.ok(lines.some((line) => line.includes("Showing 8 of 12 · /mcp")));
  assert.ok(lines.some((line) => line.includes("server-08")));
  assert.ok(lines.every((line) => !line.includes("server-09")));
  assert.ok(lines.some((line) => line.includes("tools registered")));
  assert.ok(lines.some((line) => line.includes("connection status: /mcp")));
  assert.ok(lines.length <= 14);
});

test("maps only visible namespace rows to click activation without taking focus", () => {
  const opened: string[] = [];
  const sidebar = new McpSidebar(
    { requestRender: () => {} } as any,
    {
      fg: (_tone: string, text: string) => text,
      bold: (text: string) => text,
      style: (text: string) => text,
    } as any,
    (namespaceId) => opened.push(namespaceId),
  );
  sidebar.setServers(buildMcpServers(tools));
  const lines = sidebar.render(32);
  const context7Row = lines.findIndex((line) => line.includes("context7"));

  assert.ok(context7Row > 0);
  assert.deepEqual(
    sidebar.handleMouse?.({
      type: "click",
      button: "left",
      x: 4,
      y: context7Row,
      screenX: 4,
      screenY: context7Row,
      width: 32,
      height: lines.length,
      shift: false,
      alt: false,
      ctrl: false,
    }),
    { handled: true },
  );
  assert.deepEqual(opened, ["context7"]);
  assert.equal(sidebar.handleMouse?.({
    type: "click",
    button: "left",
    x: 4,
    y: 0,
    screenX: 4,
    screenY: 0,
    width: 32,
    height: lines.length,
    shift: false,
    alt: false,
    ctrl: false,
  }), undefined);
});

test("applies semantic theme roles to the sidebar frame, title, body, and selected row", () => {
  const tones: string[] = [];
  const layout = renderSidebarLayout(
    buildMcpServers(tools),
    32,
    (text, tone = "text") => {
      tones.push(tone);
      return text;
    },
    "context7",
  );

  assert.ok(layout.lines.some((line) => line.includes("context7")));
  assert.ok(tones.includes("border"));
  assert.ok(tones.includes("title"));
  assert.ok(tones.includes("text"));
  assert.ok(tones.includes("dim"));
  assert.ok(tones.includes("success"));
  assert.ok(tones.includes("selected"));
});

test("renders bounded theme-aware tool descriptions with scroll guidance", () => {
  const tones: string[] = [];
  const lines = renderToolDetailsLines(
    "context7",
    buildMcpToolDetails(tools, "context7"),
    46,
    9,
    0,
    (text, tone = "text") => {
      tones.push(tone);
      return text;
    },
  );

  assert.equal(lines.length, 9);
  assert.ok(lines.some((line) => line.includes("tools registered")));
  assert.ok(lines.some((line) => line.includes("/mcp")));
  assert.ok(lines.every((line) => !line.includes("status unknown")));
  assert.ok(lines.some((line) => line.includes("query_docs")));
  assert.ok(lines.some((line) => line.includes("↑/↓ scroll · esc close")));
  assert.ok(lines.every((line) => visibleWidth(line) <= 46));
  assert.ok(tones.includes("border"));
  assert.ok(tones.includes("title"));
  assert.ok(tones.includes("accent"));
  assert.ok(tones.includes("dim"));
});

test("scrolls and closes the capturing detail component without exceeding terminal bounds", () => {
  let renders = 0;
  let closes = 0;
  const terminal = { rows: 12, columns: 80 };
  const details = new McpToolDetails(
    { terminal, requestRender: () => renders++ } as any,
    {
      fg: (_tone: string, text: string) => text,
      bold: (text: string) => text,
    } as any,
    "demo",
    Array.from({ length: 8 }, (_, index) => ({
      name: `tool_${index + 1}`,
      description: `Description for tool ${index + 1}.`,
    })),
    () => closes++,
  );

  const initial = details.render(42);
  details.handleInput("\u001b[B");
  details.handleInput("\u001b[6~");
  const scrolled = details.render(42);

  assert.ok(renders >= 1);
  assert.notDeepEqual(scrolled, initial);
  assert.ok(scrolled.length <= Math.floor(terminal.rows * 0.8));
  assert.ok(scrolled.every((line) => visibleWidth(line) <= 42));

  terminal.rows = 40;
  const resized = details.render(42);
  assert.ok(resized.length <= Math.floor(terminal.rows * 0.8));

  details.handleInput("\u001b");
  details.handleInput("\u0003");
  assert.equal(closes, 1);
});
