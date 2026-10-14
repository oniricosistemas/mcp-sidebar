export interface ToolDescriptor {
  name: string;
  exposure?: string;
  namespace?: {
    name: string;
  };
}

export interface McpServerView {
  id: string;
  label: string;
  toolCount: number;
  availability: "available";
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
      availability: "available" as const,
    }));
}

export function shouldShowSidebar(terminalWidth: number): boolean {
  return terminalWidth >= MIN_SIDEBAR_TERMINAL_WIDTH;
}
