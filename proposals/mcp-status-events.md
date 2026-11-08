# Feature request: sanitized MCP server status (snapshot + change events)

## Summary

Extensions can discover MCP **tools** through `pi.getAllTools()`, but there is no supported way to
learn the **connection status** of MCP servers. UIs that surface MCP state must either point users
at `/mcp` or invent status they cannot verify.

This proposal asks for a sanitized status surface — a snapshot plus change events — that extensions
can render honestly, without ever exposing credentials, raw transport errors, or auth flows.

## Current behavior

A real extension (mcp-sidebar, a passive MCP panel for Pi and Gentle Shell) infers server
namespaces from the tool inventory alone:

```ts
pi.getAllTools()
// tools appear under namespaces such as `mcp__context7`, names such as `mcp__context7__query_docs`
```

That inventory proves tools are **registered**. It says nothing about transport health: a server
can be listed while its connection is down, retrying, or awaiting authentication. Because no status
signal exists, the sidebar is deliberately honest and shows:

```text
tools registered
connection status: /mcp
```

That honesty boundary is correct but unhelpful: the panel cannot say which namespace is ready,
which is still connecting, and which failed.

## Proposed API (sketch)

A read-only, sanitized snapshot plus change notification:

```ts
interface McpServerStatus {
  name: string;                                  // matches the `mcp__<name>` namespace
  state: "connecting" | "ready" | "error" | "disabled";
  tools?: number;                                // registered tool count, when known
  error?: { kind: "auth" | "timeout" | "transport" | "config" | "unknown" };
  since: number;                                 // timestamp of the last state change
}

pi.getMcpStatus(): McpServerStatus[];             // snapshot
pi.onMcpStatusChanged(cb: (all: McpServerStatus[]) => void): Disposable;  // event
```

### Sanitization contract (the core requirement)

1. **No secrets, ever** — no tokens, headers, URLs with credentials, env values, or auth prompts.
2. **No raw transport errors** — only the closed `error.kind` enum; the raw message may contain
   hostnames, ports, paths, or provider details and stays behind `/mcp`.
3. **Namespace correlation** — `name` matches the `mcp__<name>` namespace from `getAllTools()`, so
   UIs can join status with the tool inventory they already render.
4. **Stable states** — the state enum is part of the contract; adding states is a minor change,
   reusing or rewording existing ones is breaking.
5. **Lazy-friendly** — `getMcpStatus()` must be cheap and side-effect free; it must not trigger
   connections. The events report transitions the runtime already knows about.

## Why this matters

- **Honest UIs:** panels can show `context7 · ready`, `engram · error (auth)` instead of a blanket
  "status: /mcp".
- **Early diagnosis:** users see a failing namespace before opening a tool that will time out.
- **One sanitization boundary upstream:** extensions stop parsing `/mcp` output or scraping
  terminal state, and no extension has to reinvent redaction.

## Alternatives considered

- **Parse `/mcp` output** — brittle, couples UIs to formatting, and duplicates redaction logic in
  every extension. This is what extensions would otherwise be forced into.
- **Expose raw connection errors** — rejected: raw transport messages leak infrastructure details
  the terminal UI keeps behind `/mcp` for a reason.
- **Expand `getAllTools()` items with status** — conflates two lifecycles (registration vs.
  transport) and forces every consumer to re-filter; a dedicated status surface stays additive.

## Evidence

- mcp-sidebar's honesty boundary and status rendering:
  https://github.com/oniricosistemas/mcp-sidebar/blob/main/src/sidebar.ts
- Namespace/tool correlation logic (`mcp__<id>` parsing):
  https://github.com/oniricosistemas/mcp-sidebar/blob/main/src/mcp-view-model.ts
- The `/mcp` command is today's authoritative connection/auth surface; this proposal deliberately
  does not change it.

## Non-goals

- Replacing or wrapping `/mcp`; auth and connection management stay exactly where they are.
- Per-tool health or latency metrics.
- Retrying/reconnect control from extensions — status is read-only in this proposal.

## Decision (2026-10-31)

Aceptado. La propuesta se adopta como la API de estado sanitizado para `mcp-sidebar`. Se implementará en `mcp-view-model.ts` con los estados `connecting | ready | error | disabled`, correlados por namespace (`mcp__<name>`), sin exponer datos sensibles ni errores crudos. El archivo `src/mcp-view-model.ts` ya deriva `connected`/`disconnected` como paso inicial; la integración completa (`getMcpStatus` / evento) queda pendiente del runtime (`pi`).

Actualización (2026-10-31): se agregó `getMcpStatusStub()` en `mcp-view-model.ts` como implementación provisional que deriva `McpServerStatus[]` del inventario existente (`pi.getAllTools()`), con los estados `ready`/`connecting` como aproximaciones honestas. Queda pendiente la integración con la API real (`pi.getMcpStatus()` y `pi.onMcpStatusChanged()`) una vez esté disponible en el runtime.

Actualización (2026-11-07): la integración con la API real quedó implementada en `src/extension.ts`
mediante feature detection de ambos métodos, suscripción por sesión (dispose en `session_shutdown`)
y unión por namespace en `buildMcpServers(tools, status?)`. `getMcpStatusStub()` se eliminó: sin la
API el panel no muestra ningún estado (ni etiquetas por servidor ni la fila `connection status: /mcp`);
con la API muestra los estados reales `connecting | ready | error | disabled` por namespace y en el
diálogo de detalles. La API sigue sin estar en ningún Pi publicado (ni 1.4.0 ni 1.5.0) ni en
`gentle-pi@4.7.0`: gentle-shell la documenta en `docs/mcp-status.md` (PR #2734) para builds de Pi que
la incluyan, y esa documentación es la referencia de contrato de esta integración.
