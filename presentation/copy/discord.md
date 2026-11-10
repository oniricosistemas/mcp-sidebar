📦 **MCP Sidebar** — panel persistente de MCP para Gentle Shell / Pi

**Qué es:** un sidebar que muestra tus servers MCP y sus tools registradas directo en el rail nativo de la terminal. Click en un namespace y ves nombres + descripciones reales de cada tool; sin mouse, `/mcp-tools [namespace]`.

**Detalles que importan:**
· Pasivo por contrato (`nonCapturing`) — no roba el foco del editor.
· Honesto: dice `tools registered` y manda el estado de conexión real a `/mcp`. No inventa nada.
· Feature-detected: compone el rail de Gentle Shell por identidad y apila paneles por altura real. En Pi standalone cae al overlay, y si el rail se oculta (terminal angosta), MCP se oculta con Status.
· Colapsable (`/mcp-sidebar-collapse` o `Ctrl+Shift+M`), theme-aware, y con detalle de tools scrolleable.

**Cómo se hizo:** test-first (RED→GREEN por cada regla), capturas reales del TUI para la evidencia, y una verificación independiente de alto riesgo que encontró dos blockers antes de cerrar. 22/22 tests.

Código y specs: github.com/oniricosistemas/mcp-sidebar

Feedback y PRs bienvenidos.
