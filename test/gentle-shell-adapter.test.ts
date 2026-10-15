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
  state.parts.set("footer", replacement);

  attachment.dispose();
  attachment.dispose();
  assert.equal(state.parts.get("footer"), replacement);
});
