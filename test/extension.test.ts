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
  const theme = { fg: (_tone: string, text: string) => `\x1b[32m${text}\x1b[0m` };
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
  assert.deepEqual([...commands.keys()], ["mcp-sidebar"]);

  events.get("session_start")?.({}, context);
  assert.equal(options.overlay, true);
  assert.equal(options.overlayOptions?.nonCapturing, true);
  assert.equal(options.overlayOptions?.anchor, "right-center");
  assert.equal(options.overlayOptions?.visible?.(99, 30), false);
  assert.equal(options.overlayOptions?.visible?.(100, 30), true);
  assert.equal(statuses.at(-1)?.[1], "1 MCP server");
  assert.ok(component?.render(32).every((line) => visibleWidth(line) <= 32));

  await commands.get("mcp-sidebar")?.handler("", context);
  assert.equal(options.overlayOptions?.visible?.(100, 30), false);
  await commands.get("mcp-sidebar")?.handler("", context);
  assert.equal(options.overlayOptions?.visible?.(100, 30), true);
  assert.deepEqual(hidden, [true, false]);

  tools = [];
  events.get("agent_end")?.();
  assert.equal(statuses.at(-1)?.[1], "0 MCP servers");
  assert.ok(component?.render(32).some((line) => line.includes("No MCP tools available")));

  events.get("session_shutdown")?.();
  await Promise.resolve();
  assert.equal(finished, 1);
  assert.deepEqual(statuses.at(-1), ["mcp-sidebar", undefined]);

  await commands.get("mcp-sidebar")?.handler("", { ...context, mode: "print" });
  assert.deepEqual(notices.at(-1), ["MCP Sidebar requires interactive TUI mode.", "warning"]);
  assert.ok(renders >= 2);
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
