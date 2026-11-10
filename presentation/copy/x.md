Construimos MCP Sidebar para Gentle Shell/Pi: un panel persistente de servers MCP y sus tools dentro del rail nativo de la terminal.

Pasivo por contrato: nunca roba el foco. Honesto: el estado de conexión real queda en /mcp. Sin modificar Gentle Shell. 🧵

---

Click en un namespace → modal con las tools reales y sus descripciones. Sin mouse: /mcp-tools [namespace].

Theme del theme activo, colapsable con Ctrl+Shift+M, y responsive: al achicar la terminal, Status y MCP desaparecen juntos.

---

La pieza técnica: un adapter feature-detected que compone el footer del rail de Gentle Shell por identidad y apila paneles por altura renderizada.

Si el rail falta o cambia de dueño, cae al overlay standalone. Distinguir isMounted() de isActive() resolvió el bug responsive.

---

La entrega fue parte del diseño: 1.670 líneas en 8 PRs encadenados, cada uno ≤390 líneas, con tests y docs junto al comportamiento.

22/22 tests, typecheck y una verificación independiente que encontró dos blockers reales antes del cierre.

---

Código, specs y evidencia del proceso: github.com/oniricosistemas/mcp-sidebar

Feedback bienvenido — sobre todo de gente que vive en la terminal. ✨
