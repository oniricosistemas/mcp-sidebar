import assert from "node:assert/strict";
import test from "node:test";

import type { Component, OverlayOptions } from "@earendil-works/pi-tui";
import { visibleWidth } from "@earendil-works/pi-tui";

import extension from "../src/extension.ts";
import { buildMcpServers } from "../src/mcp-view-model.ts";

interface CommandRegistration {
  handler: (args: string, context: unknown) => Promise<void>;
}

test("registers, toggles, refreshes, and cleans up through Pi's public extension API", async () => {
  const commands = new Map<string, CommandRegistration>();
  const events = new Map<string, (...args: any[]) => void>();
  const statuses: [string, string | undefined][] = [];
  const notices: [string, string][] = [];
  const hidden: boolean[] = [];
  let options: { overlay?: boolean; overlayOptions?: OverlayOptions } = {};
  let component: Component | undefined;
  let finished = 0;
  let renders = 0;
  let tools = [
    {
      name: "mcp__demo__read",
      namespace: { name: "mcp__demo" },
      exposure: "direct",
    },
  ];

  const pi = {
    registerCommand: (name: string, command: CommandRegistration) => commands.set(name, command),
    on: (name: string, handler: (...args: any[]) => void) => events.set(name, handler),
    getAllTools: () => tools,
  };
  const theme = {
    fg: (_tone: string, text: string) => `\x1b[32m${text}\x1b[0m`,
    bold: (text: string) => text,
    style: (text: string) => text,
  };
  const context = {
    mode: "tui",
    ui: {
      setStatus: (key: string, value: string | undefined) => statuses.push([key, value]),
      notify: (message: string, level: string) => notices.push([message, level]),
      custom: (
        factory: (...args: any[]) => Component,
        customOptions: typeof options & { onHandle?: (handle: unknown) => void },
      ) => {
        options = customOptions;
        customOptions.onHandle?.({ setHidden: (value: boolean) => hidden.push(value) });
        return new Promise<void>((resolve) => {
          component = factory(
            { requestRender: () => renders++ },
            theme,
            {},
            () => {
              finished++;
              resolve();
            },
          );
        });
      },
    },
  };

  extension(pi as any);
  assert.deepEqual([...commands.keys()], ["mcp-sidebar", "mcp-tools"]);

  events.get("session_start")?.({}, context);
  assert.equal(options.overlay, true);
  assert.equal(options.overlayOptions?.nonCapturing, true);
  assert.equal(options.overlayOptions?.anchor, "bottom-right");
  assert.equal(options.overlayOptions?.width, 48);
  assert.equal(options.overlayOptions?.minWidth, 29);
  assert.deepEqual(options.overlayOptions?.margin, { right: 2, bottom: 1 });
  assert.equal(options.overlayOptions?.visible?.(99, 30), false);
  assert.equal(options.overlayOptions?.visible?.(100, 30), true);
  assert.equal(statuses.at(-1)?.[1], "1 MCP namespace");
  assert.ok(component?.render(32).every((line) => visibleWidth(line) <= 32));

  await commands.get("mcp-sidebar")?.handler("", context);
  assert.equal(options.overlayOptions?.visible?.(100, 30), false);
  await commands.get("mcp-sidebar")?.handler("", context);
  assert.equal(options.overlayOptions?.visible?.(100, 30), true);
  assert.deepEqual(hidden, [true, false]);

  tools = [];
  events.get("agent_end")?.();
  assert.equal(statuses.at(-1)?.[1], "0 MCP namespaces visible");
  assert.ok(component?.render(32).some((line) => line.includes("No registered MCP tools yet")));

  events.get("session_shutdown")?.();
  await Promise.resolve();
  assert.equal(finished, 1);
  assert.deepEqual(statuses.at(-1), ["mcp-sidebar", undefined]);

  await commands.get("mcp-sidebar")?.handler("", { ...context, mode: "print" });
  assert.deepEqual(notices.at(-1), ["MCP Sidebar requires interactive TUI mode.", "warning"]);
  assert.ok(renders >= 2);
});

test("restores one existing overlay into the new TUI session context", async () => {
  const commands = new Map<string, CommandRegistration>();
  const events = new Map<string, (...args: any[]) => void>();
  const hidden: boolean[] = [];
  const firstStatuses: [string, string | undefined][] = [];
  const secondStatuses: [string, string | undefined][] = [];
  let customCalls = 0;

  const pi = {
    registerCommand: (name: string, command: CommandRegistration) => commands.set(name, command),
    on: (name: string, handler: (...args: any[]) => void) => events.set(name, handler),
    getAllTools: () => [
      {
        name: "mcp__context7__query_docs",
        namespace: { name: "mcp__context7" },
        exposure: "deferred",
      },
    ],
  };
  const theme = {
    fg: (_tone: string, text: string) => text,
    bold: (text: string) => text,
    style: (text: string) => text,
  };
  const makeContext = (statuses: [string, string | undefined][]) => ({
    mode: "tui",
    ui: {
      setStatus: (key: string, value: string | undefined) => statuses.push([key, value]),
      notify: () => {},
      custom: (
        factory: (...args: any[]) => Component,
        options: { onHandle?: (handle: unknown) => void },
      ) => {
        customCalls++;
        options.onHandle?.({ setHidden: (value: boolean) => hidden.push(value) });
        return new Promise<void>((resolve) => {
          factory({ requestRender: () => {} }, theme, {}, () => resolve());
        });
      },
    },
  });
  const firstContext = makeContext(firstStatuses);
  const secondContext = makeContext(secondStatuses);

  extension(pi as any);
  try {
    events.get("session_start")?.({}, firstContext);
    await commands.get("mcp-sidebar")?.handler("", firstContext);
    assert.deepEqual(hidden, [true]);

    events.get("session_start")?.({}, secondContext);

    assert.equal(customCalls, 1);
    assert.deepEqual(hidden, [true, false]);
    assert.deepEqual(secondStatuses.at(-1), ["mcp-sidebar", "1 MCP namespace"]);
  } finally {
    events.get("session_shutdown")?.();
  }
});

test("refreshes deferred MCP inventory while idle and stops polling on shutdown", () => {
  const events = new Map<string, (...args: any[]) => void>();
  const statuses: [string, string | undefined][] = [];
  let component: Component | undefined;
  let renders = 0;
  let tools: { name: string; namespace: { name: string }; exposure: string }[] = [];
  let intervalHandler: (() => void) | undefined;
  let intervalMs: number | undefined;
  const intervalToken = { id: "mcp-refresh" };
  let clearedToken: unknown;

  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  globalThis.setInterval = ((handler: () => void, milliseconds: number) => {
    intervalHandler = handler;
    intervalMs = milliseconds;
    return intervalToken;
  }) as unknown as typeof setInterval;
  globalThis.clearInterval = ((token: unknown) => {
    clearedToken = token;
  }) as typeof clearInterval;

  try {
    extension({
      registerCommand: () => {},
      on: (name: string, handler: (...args: any[]) => void) => events.set(name, handler),
      getAllTools: () => tools,
    } as any);

    const context = {
      mode: "tui",
      ui: {
        setStatus: (key: string, value: string | undefined) => statuses.push([key, value]),
        notify: () => {},
        custom: (factory: (...args: any[]) => Component) => {
          component = factory(
            { requestRender: () => renders++ },
            {
              fg: (_tone: string, text: string) => text,
              bold: (text: string) => text,
              style: (text: string) => text,
            },
            {},
            () => {},
          );
          return new Promise<void>(() => {});
        },
      },
    };

    events.get("session_start")?.({}, context);
    assert.equal(intervalMs, 1000);
    assert.ok(intervalHandler);
    assert.deepEqual(statuses.at(-1), ["mcp-sidebar", "0 MCP namespaces visible"]);
    assert.equal(renders, 1);
    const initialStatusWrites = statuses.length;

    intervalHandler?.();
    assert.equal(renders, 1);
    assert.equal(statuses.length, initialStatusWrites);

    tools = [
      {
        name: "mcp__context7__query_docs",
        namespace: { name: "mcp__context7" },
        exposure: "deferred",
      },
    ];
    intervalHandler?.();

    assert.deepEqual(statuses.at(-1), ["mcp-sidebar", "1 MCP namespace"]);
    assert.ok(component?.render(32).some((line) => line.includes("context7")));
    assert.equal(renders, 2);
    assert.equal(statuses.length, initialStatusWrites + 1);

    intervalHandler?.();
    assert.equal(renders, 2);
    assert.equal(statuses.length, initialStatusWrites + 1);

    events.get("session_shutdown")?.();
    assert.equal(clearedToken, intervalToken);
  } finally {
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
});

test("deduplicates tools and rejects malformed or hidden MCP inventory", () => {
  const tool = {
    name: "mcp__x__read",
    namespace: { name: "mcp__x" },
    exposure: "deferred",
  };

  assert.deepEqual(
    buildMcpServers([
      tool,
      tool,
      { ...tool, exposure: "hidden" },
      { name: "mcp__x__bad", namespace: { name: "mcp__" } },
      { name: "read", namespace: { name: "mcp__x" } },
    ]),
    [{ id: "x", label: "x", toolCount: 1, availability: "available" }],
  );
  assert.deepEqual(buildMcpServers([]), []);
});

test("mounts below Gentle Shell Status and keeps the standalone overlay as fallback", async () => {
  const commands = new Map<string, CommandRegistration>();
  const events = new Map<string, (...args: any[]) => void>();
  const components: Component[] = [];
  const customOptions: any[] = [];
  const status: Component = {
    render: () => ["Status", "Project demo"],
    invalidate: () => {},
  };
  let railOwnsHost = true;
  const sidebarState = {
    active: true,
    ownsHost: () => railOwnsHost,
    parts: new Map([["footer", status]]),
  };
  const tui = {
    mode: "fullscreen",
    terminal: {
      rows: 40,
      columns: 140,
      [Symbol.for("gentle-pi.experimental-sidebar.state")]: sidebarState,
    },
    requestRender: () => {},
  };
  const theme = {
    fg: (_tone: string, text: string) => text,
    bold: (text: string) => text,
    style: (text: string) => text,
  };
  const context = {
    mode: "tui",
    ui: {
      setStatus: () => {},
      notify: () => {},
      select: async () => undefined,
      custom: (
        factory: (...args: any[]) => Component,
        options: { onHandle?: (handle: unknown) => void },
      ) => {
        customOptions.push(options);
        options.onHandle?.({ setHidden: () => {} });
        return new Promise<void>((resolve) => {
          components.push(factory(tui, theme, {}, () => resolve()));
        });
      },
    },
  };
  extension({
    registerCommand: (name: string, command: CommandRegistration) => commands.set(name, command),
    on: (name: string, handler: (...args: any[]) => void) => events.set(name, handler),
    getAllTools: () => [{
      name: "mcp__demo__read",
      description: "Read demo data.",
      namespace: { name: "mcp__demo" },
      exposure: "deferred",
    }],
  } as any);

  events.get("session_start")?.({}, context);
  const wrapper = sidebarState.parts.get("footer")!;
  assert.notEqual(wrapper, status);
  assert.equal(customOptions[0]?.overlayOptions?.visible?.(140, 40), false);
  railOwnsHost = false;
  assert.equal(
    customOptions[0]?.overlayOptions?.visible?.(120, 40),
    true,
    "fallback must reappear when the native rail no longer owns the host",
  );
  railOwnsHost = true;
  assert.equal(customOptions[0]?.overlayOptions?.visible?.(140, 40), false);
  assert.deepEqual(wrapper.render(48).slice(0, 2), ["Status", "Project demo"]);
  assert.ok(wrapper.render(48).some((line) => line.includes("demo")));

  await commands.get("mcp-sidebar")?.handler("", context);
  assert.deepEqual(wrapper.render(48), ["Status", "Project demo"]);
  await commands.get("mcp-sidebar")?.handler("", context);
  assert.ok(wrapper.render(48).some((line) => line.includes("demo")));

  const detailsOpen = commands.get("mcp-tools")!.handler("demo", context);
  await Promise.resolve();
  assert.deepEqual(wrapper.render(48), ["Status", "Project demo"]);
  components[1]?.handleInput?.("\u001b");
  await detailsOpen;
  assert.ok(wrapper.render(48).some((line) => line.includes("demo")));

  events.get("session_shutdown")?.();
  await Promise.resolve();
  assert.equal(sidebarState.parts.get("footer"), status);
});

test("opens one namespace detail modal from command or click and restores the passive sidebar", async () => {
  const commands = new Map<string, CommandRegistration>();
  const events = new Map<string, (...args: any[]) => void>();
  const notices: [string, string][] = [];
  const selections: { title: string; options: string[] }[] = [];
  const hidden: boolean[] = [];
  const finished: string[] = [];
  const components: Component[] = [];
  const customOptions: any[] = [];
  const detailDone: (() => void)[] = [];
  let selected: string | undefined;
  let sidebarHidden = false;

  const tools = [
    {
      name: "mcp__demo__read_item",
      description: "Read one item from the demo server.",
      namespace: { name: "mcp__demo" },
      exposure: "deferred",
    },
    {
      name: "mcp__other__search",
      description: "Search another server.",
      namespace: { name: "mcp__other" },
      exposure: "codemode",
    },
  ];
  const theme = {
    fg: (_tone: string, text: string) => text,
    bold: (text: string) => text,
    style: (text: string) => text,
  };
  const tui = {
    mode: "fullscreen",
    terminal: { rows: 24, columns: 120 },
    requestRender: () => {},
  };
  const context = {
    mode: "tui",
    ui: {
      setStatus: () => {},
      notify: (message: string, level: string) => notices.push([message, level]),
      select: async (title: string, options: string[]) => {
        selections.push({ title, options });
        return selected;
      },
      custom: (
        factory: (...args: any[]) => Component,
        options: { onHandle?: (handle: unknown) => void },
      ) => {
        const callIndex = components.length;
        customOptions.push(options);
        if (callIndex === 0) {
          options.onHandle?.({
            setHidden: (value: boolean) => {
              sidebarHidden = value;
              hidden.push(value);
            },
            isHidden: () => sidebarHidden,
          });
        }
        return new Promise<void>((resolve) => {
          const done = () => {
            finished.push(callIndex === 0 ? "sidebar" : "details");
            resolve();
          };
          const component = factory(tui, theme, {}, done);
          components.push(component);
          if (callIndex > 0) detailDone.push(done);
        });
      },
    },
  };

  extension({
    registerCommand: (name: string, command: CommandRegistration) => commands.set(name, command),
    on: (name: string, handler: (...args: any[]) => void) => events.set(name, handler),
    getAllTools: () => tools,
  } as any);
  events.get("session_start")?.({}, context);

  await commands.get("mcp-tools")?.handler("missing", context);
  assert.deepEqual(notices.at(-1), ["Unknown MCP namespace: missing", "warning"]);
  assert.equal(components.length, 1);

  selected = undefined;
  await commands.get("mcp-tools")?.handler("", context);
  assert.deepEqual(selections.at(-1), {
    title: "MCP namespace",
    options: ["demo", "other"],
  });
  assert.equal(components.length, 1);

  selected = "demo";
  const commandOpen = commands.get("mcp-tools")!.handler("", context);
  await Promise.resolve();
  assert.equal(components.length, 2);
  assert.equal(customOptions[1]?.overlayOptions?.nonCapturing, undefined);
  assert.equal(customOptions[1]?.overlayOptions?.anchor, "center");
  assert.deepEqual(hidden, [true]);
  assert.ok(components[1]?.render(48).some((line) => line.includes("read_item")));
  assert.ok(components[1]?.render(48).some((line) => line.includes("Read one item")));

  await commands.get("mcp-tools")?.handler("other", context);
  assert.equal(components.length, 2);
  assert.deepEqual(notices.at(-1), ["MCP tool details are already open.", "info"]);

  components[1]?.handleInput?.("\u001b");
  await commandOpen;
  assert.deepEqual(hidden, [true, false]);

  const sidebarLines = components[0]!.render(32);
  const demoRow = sidebarLines.findIndex((line) => line.includes("demo"));
  components[0]?.handleMouse?.({
    type: "click",
    button: "left",
    x: 4,
    y: demoRow,
    screenX: 4,
    screenY: demoRow,
    width: 32,
    height: sidebarLines.length,
    shift: false,
    alt: false,
    ctrl: false,
  });
  await Promise.resolve();
  assert.equal(components.length, 3);
  assert.equal(sidebarHidden, true);

  events.get("session_shutdown")?.();
  await Promise.resolve();
  assert.deepEqual(finished.slice(-2), ["details", "sidebar"]);
});
