import type {
  Component,
  TUI,
  TuiMouseEvent,
  TuiMouseEventResult,
} from "@earendil-works/pi-tui";

export const GENTLE_SHELL_SIDEBAR_STATE = Symbol.for(
  "gentle-pi.experimental-sidebar.state",
);

const MCP_RAIL_STACK = Symbol.for("mcp-sidebar.gentle-shell-rail-stack");

type RailComponent = Component & { digest?: () => string };
type SidebarState = {
  active?: boolean;
  ownsHost?: () => boolean;
  parts: Map<string, RailComponent>;
};
type Participant = {
  component: RailComponent;
  visible: boolean;
};
type RenderedSegment = {
  component: RailComponent;
  startY: number;
  height: number;
};
type RailStack = {
  host: SidebarState;
  original: RailComponent;
  wrapper: RailComponent;
  participants: Map<symbol, Participant>;
  revision: number;
  segments: RenderedSegment[];
};
type CompatibleTerminal = Record<symbol, unknown>;

export interface GentleShellRailAttachment {
  isMounted(): boolean;
  isActive(): boolean;
  setVisible(visible: boolean): void;
  invalidate(): void;
  dispose(): void;
}

function isComponent(value: unknown): value is RailComponent {
  return typeof value === "object" && value !== null &&
    typeof (value as Component).render === "function" &&
    typeof (value as Component).invalidate === "function";
}

function readHostState(terminal: CompatibleTerminal): SidebarState | undefined {
  const candidate = terminal[GENTLE_SHELL_SIDEBAR_STATE];
  if (typeof candidate !== "object" || candidate === null) return undefined;
  const parts = (candidate as { parts?: unknown }).parts;
  if (!(parts instanceof Map)) return undefined;
  return candidate as SidebarState;
}

function railOwnsHost(host: SidebarState): boolean {
  if (typeof host.ownsHost === "function") {
    try {
      return host.ownsHost() === true;
    } catch {
      return false;
    }
  }
  return host.active !== false;
}

function childMouseEvent(
  event: TuiMouseEvent,
  segment: RenderedSegment,
): TuiMouseEvent {
  return {
    ...event,
    y: event.y - segment.startY,
    height: segment.height,
  };
}

function createStack(tui: TUI, host: SidebarState, original: RailComponent): RailStack {
  let stack: RailStack;
  const wrapper: RailComponent = {
    render(width: number): string[] {
      const lines: string[] = [];
      const segments: RenderedSegment[] = [];
      const append = (component: RailComponent) => {
        const rendered = [...component.render(width)];
        if (rendered.length > 0) {
          segments.push({ component, startY: lines.length, height: rendered.length });
          lines.push(...rendered);
        }
      };

      append(original);
      for (const participant of stack.participants.values()) {
        if (participant.visible) append(participant.component);
      }
      stack.segments = segments;
      return lines;
    },
    invalidate(): void {
      stack.revision++;
      stack.segments = [];
      original.invalidate();
      for (const participant of stack.participants.values()) {
        participant.component.invalidate();
      }
    },
    digest(): string {
      let originalDigest = "";
      try {
        originalDigest = original.digest?.() ?? "";
      } catch {
        // A host digest failure degrades that component to explicit invalidation.
      }
      const participantDigests: string[] = [];
      for (const participant of stack.participants.values()) {
        if (!participant.visible) continue;
        let digest = "";
        try {
          digest = participant.component.digest?.() ?? "";
        } catch {
          // A participant digest failure also degrades to explicit invalidation.
        }
        participantDigests.push(digest);
      }
      return JSON.stringify([originalDigest, stack.revision, participantDigests]);
    },
    handleMouse(event: TuiMouseEvent): TuiMouseEventResult | undefined {
      if (event.y < 0 || event.y >= event.height) return undefined;
      const segment = stack.segments.find(
        (candidate) => event.y >= candidate.startY &&
          event.y < candidate.startY + candidate.height,
      );
      if (!segment) return undefined;
      const result = segment.component.handleMouse?.(childMouseEvent(event, segment));
      if (result?.render) stack.revision++;
      return result;
    },
  };
  stack = {
    host,
    original,
    wrapper,
    participants: new Map<symbol, Participant>(),
    revision: 0,
    segments: [],
  };
  return stack;
}

/**
 * Feature-detect Gentle Shell's terminal-owned rail and append a participant.
 * Returns undefined for plain Pi or an incompatible host so callers can retain
 * their public overlay fallback.
 */
export function attachGentleShellRailPanel(
  tui: TUI,
  component: RailComponent,
): GentleShellRailAttachment | undefined {
  if (tui.mode !== "fullscreen" || !tui.terminal) return undefined;
  const terminal = tui.terminal as unknown as CompatibleTerminal;
  const host = readHostState(terminal);
  if (!host) return undefined;

  let stack = terminal[MCP_RAIL_STACK] as RailStack | undefined;
  if (!stack || stack.host !== host || host.parts.get("footer") !== stack.wrapper) {
    const original = host.parts.get("footer");
    if (!isComponent(original)) return undefined;
    stack = createStack(tui, host, original);
    terminal[MCP_RAIL_STACK] = stack;
    host.parts.set("footer", stack.wrapper);
  }

  const participantId = Symbol("rail-participant");
  const participant: Participant = { component, visible: true };
  stack.participants.set(participantId, participant);
  stack.revision++;
  tui.requestRender();
  let disposed = false;

  const invalidate = () => {
    if (disposed) return;
    stack!.revision++;
    stack!.segments = [];
    tui.requestRender();
  };

  const isMounted = () =>
    !disposed && host.parts.get("footer") === stack!.wrapper;

  return {
    isMounted,
    isActive(): boolean {
      return isMounted() && railOwnsHost(host);
    },
    setVisible(visible: boolean): void {
      if (disposed || participant.visible === visible) return;
      participant.visible = visible;
      invalidate();
    },
    invalidate,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      stack!.participants.delete(participantId);
      stack!.revision++;
      stack!.segments = [];

      if (stack!.participants.size === 0) {
        if (host.parts.get("footer") === stack!.wrapper) {
          host.parts.set("footer", stack!.original);
        }
        if (terminal[MCP_RAIL_STACK] === stack) delete terminal[MCP_RAIL_STACK];
      }
      tui.requestRender();
    },
  };
}
