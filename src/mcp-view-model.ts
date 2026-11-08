export interface McpServerStatus {
  name: string;
  state: "connecting" | "ready" | "error" | "disabled";
  tools?: number;
  error?: { kind: "auth" | "timeout" | "transport" | "config" | "unknown" };
  since: number;
}

export interface ToolDescriptor {
  name: string;
  description?: string;
  exposure?: string;
  namespace?: {
    name: string;
  };
}

export interface McpToolDetail {
  name: string;
  description: string;
}

export interface McpServerView {
  id: string;
  label: string;
  toolCount: number;
  /** Present only when the runtime's sanitized snapshot reports this namespace. */
  availability?: McpServerStatus["state"];
}

const MCP_PREFIX = "mcp__";
const MIN_SIDEBAR_TERMINAL_WIDTH = 100;

export function buildMcpServers(
  tools: readonly ToolDescriptor[],
  status?: readonly McpServerStatus[],
): McpServerView[] {
  const servers = new Map<string, Set<string>>();

  for (const tool of tools) {
    if (tool.exposure === "hidden") continue;

    const namespace = tool.namespace?.name;
    if (!namespace?.startsWith(MCP_PREFIX)) continue;

    const id = namespace.slice(MCP_PREFIX.length);
    if (!id || !tool.name.startsWith(`${namespace}__`)) continue;

    const names = servers.get(id) ?? new Set<string>();
    names.add(tool.name);
    servers.set(id, names);
  }

  const states = new Map(status?.map((entry) => [entry.name, entry.state]));
  return [...servers.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, names]) => {
      const state = states.get(id);
      return {
        id,
        label: id.replaceAll("_", "-"),
        toolCount: names.size,
        ...(state ? { availability: state } : {}),
      };
    });
}

export function buildMcpToolDetails(
  tools: readonly ToolDescriptor[],
  namespaceId: string,
): McpToolDetail[] {
  const namespace = `${MCP_PREFIX}${namespaceId}`;
  const prefix = `${namespace}__`;
  const details = new Map<string, McpToolDetail>();

  for (const tool of tools) {
    if (tool.exposure === "hidden") continue;
    if (tool.namespace?.name !== namespace || !tool.name.startsWith(prefix)) continue;
    if (details.has(tool.name)) continue;

    details.set(tool.name, {
      name: tool.name.slice(prefix.length),
      description: tool.description?.trim() || "No description provided.",
    });
  }

  return [...details.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export function shouldShowSidebar(terminalWidth: number): boolean {
  return terminalWidth >= MIN_SIDEBAR_TERMINAL_WIDTH;
}
