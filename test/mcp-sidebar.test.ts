import assert from "node:assert/strict";
import test from "node:test";

import { visibleWidth } from "@earendil-works/pi-tui";

import {
  buildMcpServers,
  shouldShowSidebar,
  type ToolDescriptor,
} from "../src/mcp-view-model.ts";
import { renderSidebarLines } from "../src/sidebar.ts";

const tools: ToolDescriptor[] = [
  { name: "read", exposure: "direct" },
  {
    name: "mcp__context7__resolve_library_id",
    exposure: "deferred",
    namespace: { name: "mcp__context7" },
  },
  {
    name: "mcp__context7__query_docs",
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

test("shows the sidebar only when the terminal can support a passive panel", () => {
  assert.equal(shouldShowSidebar(99), false);
  assert.equal(shouldShowSidebar(100), true);
});

test("renders a width-safe panel without claiming transport connectivity", () => {
  const lines = renderSidebarLines(buildMcpServers(tools), 30, (text) => text);

  assert.equal(lines[0], "╭─ MCP servers ──────────────╮");
  assert.ok(lines.some((line) => line.includes("context7") && line.includes("2 tools")));
  assert.ok(lines.some((line) => line.includes("status unknown")));
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
  assert.ok(lines.some((line) => line.includes("status unknown")));
  assert.ok(lines.length <= 13);
});
