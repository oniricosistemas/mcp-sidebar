import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { OverlayHandle } from "@earendil-works/pi-tui";

import {
  buildMcpServers,
  buildMcpToolDetails,
  type McpServerStatus,
  type McpServerView,
} from "./mcp-view-model.ts";
import {
  attachGentleShellRailPanel,
  type GentleShellRailAttachment,
} from "./gentle-shell-adapter.ts";
import { McpSidebar } from "./sidebar.ts";
import { McpToolDetails } from "./tool-details.ts";

/**
 * Pi builds that ship the sanitized MCP status API (documented in gentle-shell's
 * `docs/mcp-status.md`) expose both methods. Everything else — including every
 * currently published Pi — gets no MCP status display at all.
 */
interface McpStatusRuntime {
  getMcpStatus?: () => McpServerStatus[];
  onMcpStatusChanged?: (
    listener: (all: McpServerStatus[]) => void,
  ) => { dispose?: () => void } | (() => void);
}

export default function mcpSidebarExtension(pi: ExtensionAPI): void {
  let panel: McpSidebar | undefined;
  let handle: OverlayHandle | undefined;
  let railAttachment: GentleShellRailAttachment | undefined;
  let finishOverlay: (() => void) | undefined;
  let finishDetails: (() => void) | undefined;
  let detailsOpen = false;
  let shuttingDown = false;
  let visible = true;
  let collapsed = false;
  let activeContext: ExtensionContext | undefined;
  let refreshTimer: ReturnType<typeof setInterval> | undefined;
  let viewStateFingerprint: string | undefined;

  const runtime = pi as ExtensionAPI & McpStatusRuntime;
  let statusSnapshot: McpServerStatus[] | undefined;
  let statusSubscription: { dispose?: () => void } | (() => void) | undefined;

  const currentServers = (): McpServerView[] =>
    buildMcpServers(pi.getAllTools(), statusSnapshot);

  const syncPresentation = (): void => {
    const showPanel = visible && !detailsOpen;
    railAttachment?.setVisible(showPanel);
    handle?.setHidden(!showPanel);
  };

  const refresh = (): void => {
    const servers = currentServers();
    const nextFingerprint = JSON.stringify({ servers, status: statusSnapshot ?? null });
    if (nextFingerprint === viewStateFingerprint) return;

    viewStateFingerprint = nextFingerprint;
    panel?.setServers(servers);
    railAttachment?.invalidate();
    const namespaceLabel = servers.length === 1 ? "namespace" : "namespaces";
    activeContext?.ui.setStatus(
      "mcp-sidebar",
      `${servers.length} MCP ${namespaceLabel}${servers.length === 0 ? " visible" : ""}`,
    );
  };

  const disposeStatusSubscription = (): void => {
    const subscription = statusSubscription;
    statusSubscription = undefined;
    if (!subscription) return;
    if (typeof subscription === "function") subscription();
    else subscription.dispose?.();
  };

  const subscribeStatus = (): void => {
    disposeStatusSubscription();
    // Detect at call time: the runtime may gain the API after this extension
    // loaded, and a frozen `typeof` result from load time would miss it.
    const onStatus = runtime.onMcpStatusChanged;
    const readStatus = runtime.getMcpStatus;
    if (typeof onStatus !== "function" || typeof readStatus !== "function") {
      statusSnapshot = undefined;
      return;
    }
    // Subscribe before reading: a change landing in the subscribe/read window
    // would otherwise be missed forever, because the inventory timer never
    // re-reads the status snapshot.
    statusSubscription = onStatus((all) => {
      statusSnapshot = all;
      refresh();
    });
    try {
      const snapshot: unknown = readStatus();
      statusSnapshot = Array.isArray(snapshot) ? (snapshot as McpServerStatus[]) : undefined;
    } catch {
      // A status API that refuses the snapshot degrades to "no status shown"
      // instead of breaking session start.
      statusSnapshot = undefined;
    }
    refresh();
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
    syncPresentation();

    try {
      await ctx.ui.custom<void>(
        (tui, theme, _keybindings, done) => {
          const details = new McpToolDetails(
            tui,
            theme,
            server.label,
            tools,
            () => done(undefined),
            () => findServer(server.id)?.availability,
          );
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
      if (!shuttingDown) syncPresentation();
    }
  };

  const mount = (ctx: ExtensionContext): void => {
    if (ctx.mode !== "tui" || panel) return;

    activeContext = ctx;
    viewStateFingerprint = undefined;
    void ctx.ui
      .custom<void>(
        (tui, theme, _keybindings, done) => {
          finishOverlay = () => done(undefined);
          panel = new McpSidebar(
            tui,
            theme,
            (namespaceId) => {
              if (activeContext) void openDetails(namespaceId, activeContext);
            },
            (nextCollapsed) => {
              collapsed = nextCollapsed;
              railAttachment?.invalidate();
            },
          );
          panel.setCollapsed(collapsed);
          railAttachment = attachGentleShellRailPanel(tui, panel);
          refresh();
          return panel;
        },
        {
          overlay: true,
          overlayOptions: {
            anchor: "bottom-right",
            width: 48,
            minWidth: 29,
            maxHeight: "70%",
            margin: { right: 2, bottom: 1 },
            nonCapturing: true,
            visible: (terminalWidth) =>
              railAttachment?.isMounted() !== true && visible && terminalWidth >= 100,
          },
          onHandle: (overlayHandle) => {
            handle = overlayHandle;
            if (!visible || detailsOpen) handle.setHidden(true);
          },
        },
      )
      .finally(() => {
        stopRefreshTimer();
        railAttachment?.dispose();
        railAttachment = undefined;
        panel = undefined;
        handle = undefined;
        finishOverlay = undefined;
      });
    startRefreshTimer();
  };

  const toggleCollapsed = (ctx: ExtensionContext): void => {
    if (ctx.mode !== "tui") {
      ctx.ui.notify("MCP Sidebar collapse requires interactive TUI mode.", "warning");
      return;
    }

    mount(ctx);
    collapsed = !collapsed;
    panel?.setCollapsed(collapsed);
    railAttachment?.invalidate();
    ctx.ui.notify(`MCP Sidebar ${collapsed ? "collapsed" : "expanded"}.`, "info");
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
      syncPresentation();
      ctx.ui.notify(`MCP Sidebar ${visible ? "shown" : "hidden"}.`, "info");
    },
  });

  pi.registerCommand("mcp-sidebar-collapse", {
    description: "Collapse or expand the MCP sidebar",
    handler: async (_args, ctx) => toggleCollapsed(ctx),
  });

  pi.registerShortcut("ctrl+shift+m", {
    description: "Collapse or expand the MCP sidebar",
    handler: (ctx) => toggleCollapsed(ctx),
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
    collapsed = false;
    subscribeStatus();
    if (ctx.mode === "tui" && panel) {
      activeContext = ctx;
      viewStateFingerprint = undefined;
      panel.setCollapsed(false);
      railAttachment?.invalidate();
      refresh();
      syncPresentation();
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
    disposeStatusSubscription();
    statusSnapshot = undefined;
    activeContext?.ui.setStatus("mcp-sidebar", undefined);
    finishDetails?.();
    railAttachment?.dispose();
    railAttachment = undefined;
    finishOverlay?.();
    activeContext = undefined;
    viewStateFingerprint = undefined;
  });
}
