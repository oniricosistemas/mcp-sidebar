import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { OverlayHandle } from "@earendil-works/pi-tui";

import {
  buildMcpServers,
  buildMcpToolDetails,
  type McpServerView,
} from "./mcp-view-model.ts";
import { McpSidebar } from "./sidebar.ts";
import { McpToolDetails } from "./tool-details.ts";

export default function mcpSidebarExtension(pi: ExtensionAPI): void {
  let panel: McpSidebar | undefined;
  let handle: OverlayHandle | undefined;
  let finishOverlay: (() => void) | undefined;
  let finishDetails: (() => void) | undefined;
  let detailsOpen = false;
  let shuttingDown = false;
  let visible = true;
  let activeContext: ExtensionContext | undefined;
  let refreshTimer: ReturnType<typeof setInterval> | undefined;
  let inventoryFingerprint: string | undefined;

  const currentServers = (): McpServerView[] => buildMcpServers(pi.getAllTools());

  const refresh = (): void => {
    const servers = currentServers();
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

  const findServer = (requested: string): McpServerView | undefined => {
    const normalized = requested.trim().replace(/^mcp__/, "");
    return currentServers().find(
      (server) => server.id === normalized || server.label === normalized,
    );
  };

  const openDetails = async (namespaceId: string, ctx: ExtensionContext): Promise<void> => {
    if (ctx.mode !== "tui") {
      ctx.ui.notify("MCP tool details require interactive TUI mode.", "warning");
      return;
    }
    if (detailsOpen) {
      ctx.ui.notify("MCP tool details are already open.", "info");
      return;
    }

    const server = findServer(namespaceId);
    if (!server) {
      ctx.ui.notify(`Unknown MCP namespace: ${namespaceId}`, "warning");
      return;
    }

    const tools = buildMcpToolDetails(pi.getAllTools(), server.id);
    detailsOpen = true;
    handle?.setHidden(true);

    try {
      await ctx.ui.custom<void>(
        (tui, theme, _keybindings, done) => {
          const details = new McpToolDetails(tui, theme, server.label, tools, () => done(undefined));
          finishDetails = () => details.close();
          return details;
        },
        {
          overlay: true,
          overlayOptions: {
            anchor: "center",
            width: "80%",
            minWidth: 40,
            maxHeight: "80%",
            margin: 1,
          },
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.ui.notify(`Unable to open MCP tool details: ${message}`, "error");
    } finally {
      detailsOpen = false;
      finishDetails = undefined;
      if (!shuttingDown) handle?.setHidden(!visible);
    }
  };

  const mount = (ctx: ExtensionContext): void => {
    if (ctx.mode !== "tui" || panel) return;

    activeContext = ctx;
    inventoryFingerprint = undefined;
    void ctx.ui
      .custom<void>(
        (tui, theme, _keybindings, done) => {
          finishOverlay = () => done(undefined);
          panel = new McpSidebar(tui, theme, (namespaceId) => {
            if (activeContext) void openDetails(namespaceId, activeContext);
          });
          refresh();
          return panel;
        },
        {
          overlay: true,
          overlayOptions: {
            anchor: "right-center",
            width: 32,
            minWidth: 29,
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
      handle?.setHidden(detailsOpen || !visible);
      ctx.ui.notify(`MCP Sidebar ${visible ? "shown" : "hidden"}.`, "info");
    },
  });

  pi.registerCommand("mcp-tools", {
    description: "Open MCP tool names and descriptions",
    handler: async (args, ctx) => {
      if (ctx.mode !== "tui") {
        ctx.ui.notify("MCP tool details require interactive TUI mode.", "warning");
        return;
      }

      const requested = args.trim();
      if (requested) {
        await openDetails(requested, ctx);
        return;
      }

      const servers = currentServers();
      if (servers.length === 0) {
        ctx.ui.notify("No registered MCP namespaces available.", "warning");
        return;
      }
      const selected = await ctx.ui.select(
        "MCP namespace",
        servers.map((server) => server.label),
      );
      if (!selected) return;
      await openDetails(selected, ctx);
    },
  });

  pi.on("session_start", (_event, ctx) => {
    shuttingDown = false;
    visible = true;
    if (ctx.mode === "tui" && panel) {
      activeContext = ctx;
      inventoryFingerprint = undefined;
      handle?.setHidden(false);
      refresh();
      startRefreshTimer();
      return;
    }
    mount(ctx);
  });

  pi.on("agent_end", () => {
    refresh();
  });

  pi.on("session_shutdown", () => {
    shuttingDown = true;
    stopRefreshTimer();
    activeContext?.ui.setStatus("mcp-sidebar", undefined);
    finishDetails?.();
    finishOverlay?.();
    activeContext = undefined;
    inventoryFingerprint = undefined;
  });
}
