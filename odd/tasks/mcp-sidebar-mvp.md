# MCP Sidebar MVP
Objective: Create and publish a usable Pi extension that surfaces MCP availability in a right-side TUI panel.
Branch: `feat/mcp-sidebar-mvp` · Delivery: `ask-on-risk` · Test runner: Node test runner + TypeScript typecheck · Forecast: ~360 authored lines (binary logo excluded).

## Specs

1. **S1 — Product goal.** Preserve the original goal verbatim: “Hola master, che veo que gentle-shell no tiene un sidebar para los mcp instalado estilo como opencode /tmp/herdr-clipboard-images-1000/client-2-clipboard-1791934995413770394-0.png quisera hacer uno para gentle-shell, se puede que me recomiendas? no tengo nada, ni repo, ni código, sería un proyecto desde cero”. Check: a new repository contains a working Pi extension MVP with an OpenCode-inspired MCP panel.
2. **S2 — GitHub and branding.** Preserve the request verbatim: “1- crea el proyecto en github, crea un lindo readme, y agrega el logo de hecho con gentle-ia, creo que deberas buscar en su repo el logo”. Check: `oniricosistemas/mcp-sidebar` exists publicly; README is scannable, credits Gentle AI, uses the official logo asset, and includes required upstream license notice.
3. **S3 — Engram.** Preserve the request verbatim: “2- enrola el proyecto en engram local y cloud”. Check: explicit local identity is initialized, Cloud enrollment succeeds for `mcp-sidebar`, sync succeeds, and status reports the project ready.
4. **S4 — Development.** Preserve the request verbatim: “3- arranca con el desarrollo”. Assumption: this authorizes the previously recommended extension-only MVP: a toggleable passive right overlay, honest tool-availability labels, responsive narrow-terminal fallback, theme-aware rendering, lifecycle cleanup, and no replacement of built-in `/mcp`. Check: behavior is covered through public interfaces with RED/GREEN evidence, typecheck passes, and the packaged extension loads.

## Tasks

- **T1** · S2 · inline (no Writer-rule trigger; cohesive foundation) · done · commit: `6c82d2c`
- **T2** · S3 · inline (CLI enrollment and verification) · done · commit: `b4a6283`
- **T3** · S1, S4 · inline (single cohesive behavior; test-first) · in progress · commit: —
- **T4** · S1-S4 · inline (integration verification and authorized GitHub publication) · pending · commit: —

## Log

- **L1 — Original request:** “Hola master, che veo que gentle-shell no tiene un sidebar para los mcp instalado estilo como opencode /tmp/herdr-clipboard-images-1000/client-2-clipboard-1791934995413770394-0.png quisera hacer uno para gentle-shell, se puede que me recomiendas? no tengo nada, ni repo, ni código, sería un proyecto desde cero”
- **L2 — Authorized scope:** “ok perfecto, hagamos lo siguiente:
1- crea el proyecto en github, crea un lindo readme, y agrega el logo de hecho con gentle-ia, creo que deberas buscar en su repo el logo
2- enrola el proyecto en engram local y cloud
3- arranca con el desarrollo”
- **L3 — Repository decision:** User selected `oniricosistemas/mcp-sidebar` with public visibility. The repository name is currently available; GitHub CLI is authenticated as `oniricosistemas`.
- **L4 — Research:** Official upstream logo is `Gentleman-Programming/gentle-shell:assets/gentle-logo-only.png` (1254×1254 PNG). Upstream is MIT licensed; preserve its notice and avoid implying endorsement because the README uses `gentle-shell™`.
- **L5 — Engram readiness:** Installed Engram is 3.4.0. Cloud is configured at `https://engram.sastrevalls`, authentication is ready, and explicit project enrollment remains pending.
- **L6 — T1 evidence:** Created public repository `https://github.com/oniricosistemas/mcp-sidebar`, initialized `main`, switched to `feat/mcp-sidebar-mvp`, added the Pi package manifest, scannable README, MIT license, official 1254×1254 logo, and upstream notice. Structural checks and `git diff --check` passed. Work-unit commit: `6c82d2c`.
- **L7 — T2 evidence:** Initialized `.engram/config.json` with explicit identity `mcp-sidebar`, enrolled it against `https://engram.sastrevalls`, exported local memories, imported the one pending remote chunk, and observed `Local chunks: 2`, `Remote chunks: 2`, `Pending import: 0`. Work-unit commit: `b4a6283`.
- **L8 — Next:** Add RED tests for MCP namespace discovery and responsive rendering, then implement the extension MVP.
