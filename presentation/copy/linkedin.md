Construimos MCP Sidebar para Gentle Shell y Pi: un panel persistente que muestra tus servers MCP y sus tools sin sacarte del flujo de trabajo.

Y lo que más valió no fue el producto: fue el proceso de ingeniería que lo llevó listo para usar.

El problema era fácil de describir y difícil de resolver: MCP estaba disponible en la sesión, pero invisible. Cada consulta exigía abrir comandos y perder contexto. Y había tres restricciones innegociables: el panel debía ser pasivo (nunca robar el foco del editor), honesto (decir "tools registered" y dejar el estado de conexión real en /mcp) y compatible (integrarse sin modificar Gentle Shell).

Cómo lo resolvimos:

· Un adapter feature-detected que compone el rail nativo del host por identidad: Status arriba, MCP debajo, y paneles futuros apilándose por altura renderizada.
· Click en un namespace abre el detalle real de sus tools (nombres y descripciones registradas). Sin mouse: /mcp-tools [namespace].
· Theme semántico del theme activo, colapsable con Ctrl+Shift+M, y responsive: cuando el terminal se achica, Status y MCP desaparecen juntos.
· Fallback al overlay standalone en Pi, sin fabricar estado de hosts inexistentes.

El bug que más nos enseñó: distinguir isMounted() de isActive(). Sin esa separación, el panel reaparecía como overlay huérfano justo cuando el rail se ocultaba.

La entrega también fue parte del diseño: 1.670 líneas divididas en 8 PRs encadenados, cada uno dentro de un presupuesto de revisión de 400 líneas, con tests y documentación junto al comportamiento. 22/22 tests verdes, typecheck, y una verificación independiente que encontró dos blockers reales antes de cerrar.

Código, specs y evidencia: github.com/oniricosistemas/mcp-sidebar

Si trabajás en la intersección de terminales, agentes y developer experience, encantado de charlarlo.
