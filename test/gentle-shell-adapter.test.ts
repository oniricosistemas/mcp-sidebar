import assert from "node:assert/strict";
import test from "node:test";

import type { Component, TuiMouseEvent } from "@earendil-works/pi-tui";

import {
  attachGentleShellRailPanel,
  GENTLE_SHELL_SIDEBAR_STATE,
} from "../src/gentle-shell-adapter.ts";

function mouse(y: number, height: number): TuiMouseEvent {
  return {
    type: "click",
    button: "left",
    x: 2,
    y,
    screenX: 90,
    screenY: 4 + y,
    width: 32,
    height,
    shift: false,
    alt: false,
    ctrl: false,
  };
}

test("stacks compatible rail panels by rendered height and routes local mouse coordinates", () => {
  const received: Array<{ owner: string; y: number; height: number }> = [];
  const status: Component = {
    render: () => ["status one", "status two"],
    invalidate: () => {},
    handleMouse: (event) => {
      received.push({ owner: "status", y: event.y, height: event.height });
      return { handled: true };
    },
  };
  const mcp: Component = {
    render: () => ["mcp one", "mcp two", "mcp three"],
    invalidate: () => {},
    handleMouse: (event) => {
      received.push({ owner: "mcp", y: event.y, height: event.height });
      return { handled: true };
    },
  };
  const future: Component = {
    render: () => ["future"],
    invalidate: () => {},
    handleMouse: (event) => {
      received.push({ owner: "future", y: event.y, height: event.height });
      return { handled: true };
    },
  };
  const state = { active: true, ownsHost: () => true, parts: new Map([["footer", status]]) };
  const terminal = { [GENTLE_SHELL_SIDEBAR_STATE]: state };
  let renders = 0;
  const tui = { mode: "fullscreen", terminal, requestRender: () => renders++ } as any;

  const mcpAttachment = attachGentleShellRailPanel(tui, mcp);
  const futureAttachment = attachGentleShellRailPanel(tui, future);
  assert.ok(mcpAttachment);
  assert.ok(futureAttachment);

  const wrapper = state.parts.get("footer")!;
  assert.deepEqual(wrapper.render(32), [
    "status one",
    "status two",
    "mcp one",
    "mcp two",
    "mcp three",
    "future",
  ]);

  wrapper.handleMouse?.(mouse(0, 6));
  wrapper.handleMouse?.(mouse(3, 6));
  wrapper.handleMouse?.(mouse(5, 6));
  assert.deepEqual(received, [
    { owner: "status", y: 0, height: 2 },
    { owner: "mcp", y: 1, height: 3 },
    { owner: "future", y: 0, height: 1 },
  ]);

  mcpAttachment.setVisible(false);
  assert.deepEqual(wrapper.render(32), ["status one", "status two", "future"]);
  assert.ok(renders >= 1);

  mcpAttachment.dispose();
  assert.equal(state.parts.get("footer"), wrapper);
  futureAttachment.dispose();
  assert.equal(state.parts.get("footer"), status);
});

test("uses panel-native participant rows when Gentle Shell exposes the 4.6 panel surface", () => {
  const received: string[] = [];
  const integrations = {
    surface: "panel" as const,
    render: () => ["▾ INTEGRATIONS", "  Engram OK"],
    invalidate: () => {},
  };
  const legacyCard: Component = {
    render: () => ["╭─ MCP servers ─╮", "╰───────────────╯"],
    invalidate: () => {},
  };
  const panelSection: Component = {
    render: () => ["▾ MCP SERVERS", "  ● context7       2 tools"],
    invalidate: () => {},
    handleMouse: () => {
      received.push("panel");
      return { handled: true };
    },
  };
  const state = {
    active: true,
    ownsHost: () => true,
    parts: new Map([["footer", integrations]]),
  };
  const tui = {
    mode: "fullscreen",
    terminal: { [GENTLE_SHELL_SIDEBAR_STATE]: state },
    requestRender: () => {},
  } as any;

  const attachment = attachGentleShellRailPanel(tui, legacyCard, panelSection);
  assert.ok(attachment);
  const wrapper = state.parts.get("footer") as Component & { surface?: "panel" };
  assert.equal(wrapper.surface, "panel", "the wrapper must remain on the shared 4.6 panel surface");
  assert.deepEqual(wrapper.render(32), [
    "▾ INTEGRATIONS",
    "  Engram OK",
    "▾ MCP SERVERS",
    "  ● context7       2 tools",
  ]);
  assert.equal(wrapper.render(32).some((line) => line.includes("╭─")), false);
  wrapper.handleMouse?.(mouse(3, 4));
  assert.deepEqual(received, ["panel"]);

  attachment.dispose();
  assert.equal(state.parts.get("footer"), integrations);
});

test("preserves current Gentle Shell card groups and offsets grouped participants", () => {
  const integrations = {
    surface: "panel" as const,
    render: () => [
      "▾ CHANGES",
      "  clean",
      "▾ INTEGRATIONS",
      "  Engram OK",
      "  /gentle:panel",
    ],
    invalidate: () => {},
    cardGroups: () => ({
      groups: [{ start: 0, end: 2 }, { start: 2, end: 4 }],
      loose: [4],
    }),
  };
  const legacyCard: Component = {
    render: () => ["╭─ MCP servers ─╮", "╰───────────────╯"],
    invalidate: () => {},
  };
  const legacyPanel: Component = {
    render: () => ["", "╭─ MCP servers ─╮", "╰───────────────╯"],
    invalidate: () => {},
  };
  const groupedPanel: Component = {
    render: () => ["▾ MCP SERVERS", "  ● context7       2 tools"],
    invalidate: () => {},
  };
  const state = {
    active: true,
    ownsHost: () => true,
    parts: new Map([[
      "footer",
      integrations,
    ]]),
  };
  const tui = {
    mode: "fullscreen",
    terminal: { [GENTLE_SHELL_SIDEBAR_STATE]: state },
    requestRender: () => {},
  } as any;

  const first = attachGentleShellRailPanel(tui, legacyCard, legacyPanel, groupedPanel);
  const second = attachGentleShellRailPanel(tui, legacyCard, legacyPanel, {
    render: () => ["▾ FUTURE", "  future row", "  future detail"],
    invalidate: () => {},
  });
  assert.ok(first);
  assert.ok(second);

  const wrapper = state.parts.get("footer") as Component & {
    cardGroups?: (width: number) => {
      groups: Array<{ start: number; end: number }>;
      loose?: number[];
    };
  };
  assert.deepEqual(wrapper.render(32), [
    "▾ CHANGES",
    "  clean",
    "▾ INTEGRATIONS",
    "  Engram OK",
    "  /gentle:panel",
    "▾ MCP SERVERS",
    "  ● context7       2 tools",
    "▾ FUTURE",
    "  future row",
    "  future detail",
  ]);
  assert.deepEqual(wrapper.cardGroups?.(32), {
    groups: [
      { start: 0, end: 2 },
      { start: 2, end: 4 },
      { start: 5, end: 7 },
      { start: 7, end: 10 },
    ],
    loose: [4],
  });

  first!.setVisible(false);
  assert.deepEqual(wrapper.render(32), [
    "▾ CHANGES",
    "  clean",
    "▾ INTEGRATIONS",
    "  Engram OK",
    "  /gentle:panel",
    "▾ FUTURE",
    "  future row",
    "  future detail",
  ]);
  assert.deepEqual(wrapper.cardGroups?.(32), {
    groups: [
      { start: 0, end: 2 },
      { start: 2, end: 4 },
      { start: 5, end: 8 },
    ],
    loose: [4],
  });

  first!.dispose();
  second!.dispose();
  assert.equal(state.parts.get("footer"), integrations);
});

test("includes participant digests so native rail height caches cannot go stale", () => {
  const status = {
    render: () => ["Status"],
    invalidate: () => {},
    digest: () => "status",
  };
  let futureHeight = 1;
  const future = {
    render: () => Array.from({ length: futureHeight }, () => "future"),
    invalidate: () => {},
    digest: () => String(futureHeight),
  };
  const state = {
    active: true,
    ownsHost: () => true,
    parts: new Map([["footer", status]]),
  };
  const tui = {
    mode: "fullscreen",
    terminal: { [GENTLE_SHELL_SIDEBAR_STATE]: state },
    requestRender: () => {},
  } as any;
  const mcp = attachGentleShellRailPanel(tui, {
    render: () => ["MCP"],
    invalidate: () => {},
  })!;
  const next = attachGentleShellRailPanel(tui, future)!;

  try {
    const wrapper = state.parts.get("footer") as Component & { digest?: () => string };
    const before = wrapper.digest?.();
    assert.equal(wrapper.render(32).length, 3);
    futureHeight = 4;
    assert.notEqual(wrapper.digest?.(), before);
    assert.equal(wrapper.render(32).length, 6);
  } finally {
    mcp.dispose();
    next.dispose();
  }
});

test("falls back on incompatible hosts and never overwrites a newer footer owner", () => {
  const panel: Component = { render: () => ["panel"], invalidate: () => {} };
  assert.equal(
    attachGentleShellRailPanel(
      { mode: "fullscreen", terminal: {}, requestRender: () => {} } as any,
      panel,
    ),
    undefined,
  );
  assert.equal(
    attachGentleShellRailPanel(
      {
        mode: "regular",
        terminal: {
          [GENTLE_SHELL_SIDEBAR_STATE]: {
            parts: new Map([["footer", panel]]),
          },
        },
        requestRender: () => {},
      } as any,
      panel,
    ),
    undefined,
  );

  const status: Component = { render: () => ["status"], invalidate: () => {} };
  const replacement: Component = { render: () => ["new owner"], invalidate: () => {} };
  const state = { active: true, ownsHost: () => true, parts: new Map([["footer", status]]) };
  const tui = {
    mode: "fullscreen",
    terminal: { [GENTLE_SHELL_SIDEBAR_STATE]: state },
    requestRender: () => {},
  } as any;
  const attachment = attachGentleShellRailPanel(tui, panel);
  assert.ok(attachment);
  assert.equal(attachment.isMounted(), true);
  state.parts.set("footer", replacement);
  assert.equal(attachment.isMounted(), false);

  attachment.dispose();
  attachment.dispose();
  assert.equal(state.parts.get("footer"), replacement);
});
