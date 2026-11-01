export interface McpServerStatus {
  name: string;
  state: "connecting" | "ready" | "error" | "disabled";
  tools?: number;
  error?: { kind: "auth" | "timeout" | "transport" | "config" | "unknown" };
  since: number;
}

// Stub provisional hasta que `pi.getMcpStatus()` esté disponible (ver proposals/mcp-status-events.md).
// Deriva del inventario existente; `ready`/`connecting` son aproximaciones honestas.
export function getMcpStatusStub(tools: readonly ToolDescriptor[]): McpServerStatus[] {
  const servers = new Map<string, { count: number; names: string[] }>();
  for (const tool of tools) {
    if (tool.exposure === "hidden") continue;
    const namespace = tool.namespace?.name;
    if (!namespace?.startsWith("mcp__")) continue;
    const id = namespace.slice("mcp__".length);
    if (!id) continue;
    const entry = servers.get(id) ?? { count: 0, names: [] };
    entry.count += 1;
    entry.names.push(tool.name);
    servers.set(id, entry);
  }
  return [...servers.entries()].map(([name, data]) => ({
    name,
    state: data.count > 0 ? ("ready" as const) : ("connecting" as const),
    tools: data.count,
    since: Date.now(),
  }));
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
  availability: "ready" | "connecting" | "error" | "disabled";
}

const MCP_PREFIX = "mcp__";
const MIN_SIDEBAR_TERMINAL_WIDTH = 100;

export function buildMcpServers(tools: readonly ToolDescriptor[]): McpServerView[] {
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

  return [...servers.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, names]) => ({
      id,
      label: id.replaceAll("_", "-"),
      toolCount: names.size,
      availability: names.size > 0 ? ("ready" as const) : (names.size === 0 ? ("connecting" as const) : ("error" as const)),
    }));
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
