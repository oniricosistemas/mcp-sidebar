import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { OverlayHandle } from "@earendil-works/pi-tui";

import { buildMcpServers } from "./mcp-view-model.ts";
import { McpSidebar } from "./sidebar.ts";

export default function mcpSidebarExtension(pi: ExtensionAPI): void {
  let panel: McpSidebar | undefined;
  let handle: OverlayHandle | undefined;
  let finishOverlay: (() => void) | undefined;
  let visible = true;
  let activeContext: ExtensionContext | undefined;
  let refreshTimer: ReturnType<typeof setInterval> | undefined;
  let inventoryFingerprint: string | undefined;

  const refresh = (): void => {
    const servers = buildMcpServers(pi.getAllTools());
    const nextFingerprint = JSON.stringify(servers);
    if (nextFingerprint === inventoryFingerprint) return;

    inventoryFingerprint = nextFingerprint;
    panel?.setServers(servers);
    const namespaceLabel = servers.length === 1 ? "namespace" : "namespaces";
    activeContext?.ui.setStatus(
      "mcp-sidebar",
      `${servers.length} MCP ${namespaceLabel}${servers.length === 0 ? " visible" : ""}`,
    );
  };

  const startRefreshTimer = (): void => {
    if (refreshTimer) return;
    refreshTimer = setInterval(refresh, 1000);
  };

  const stopRefreshTimer = (): void => {
    if (!refreshTimer) return;
    clearInterval(refreshTimer);
    refreshTimer = undefined;
  };

  const mount = (ctx: ExtensionContext): void => {
    if (ctx.mode !== "tui" || panel) return;

    activeContext = ctx;
    inventoryFingerprint = undefined;
    void ctx.ui
      .custom<void>(
        (tui, theme, _keybindings, done) => {
          finishOverlay = () => done(undefined);
          panel = new McpSidebar(tui, theme);
          refresh();
          return panel;
        },
        {
          overlay: true,
          overlayOptions: {
            anchor: "right-center",
            width: 32,
            minWidth: 28,
            maxHeight: "70%",
            margin: { right: 1 },
            nonCapturing: true,
            visible: (terminalWidth) => visible && terminalWidth >= 100,
          },
          onHandle: (overlayHandle) => {
            handle = overlayHandle;
          },
        },
      )
      .finally(() => {
        stopRefreshTimer();
        panel = undefined;
        handle = undefined;
        finishOverlay = undefined;
      });
    startRefreshTimer();
  };

  pi.registerCommand("mcp-sidebar", {
    description: "Toggle the passive MCP tools sidebar",
    handler: async (_args, ctx) => {
      if (ctx.mode !== "tui") {
        ctx.ui.notify("MCP Sidebar requires interactive TUI mode.", "warning");
        return;
      }

      mount(ctx);
      visible = !visible;
      handle?.setHidden(!visible);
      ctx.ui.notify(`MCP Sidebar ${visible ? "shown" : "hidden"}.`, "info");
    },
  });

  pi.on("session_start", (_event, ctx) => {
    visible = true;
    mount(ctx);
  });

  pi.on("agent_end", () => {
    refresh();
  });

  pi.on("session_shutdown", () => {
    stopRefreshTimer();
    activeContext?.ui.setStatus("mcp-sidebar", undefined);
    finishOverlay?.();
    activeContext = undefined;
    inventoryFingerprint = undefined;
  });
}
