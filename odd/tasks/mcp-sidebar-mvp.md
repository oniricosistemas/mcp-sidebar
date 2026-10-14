# MCP Sidebar MVP
Objective: Create and publish a usable Pi extension that surfaces MCP availability in a right-side TUI panel.
Branch: `feat/mcp-sidebar-mvp` · Delivery: `auto-chain` · Chain: `feature-branch-chain` · Test runner: Node test runner + TypeScript typecheck · Forecast: ~360 · Running: 654 authored lines (lockfile and binary logo excluded).

## Specs

1. **S1 — Product goal.** Preserve the original goal verbatim: “Hola master, che veo que gentle-shell no tiene un sidebar para los mcp instalado estilo como opencode /tmp/herdr-clipboard-images-1000/client-2-clipboard-1791934995413770394-0.png quisera hacer uno para gentle-shell, se puede que me recomiendas? no tengo nada, ni repo, ni código, sería un proyecto desde cero”. Check: a new repository contains a working Pi extension MVP with an OpenCode-inspired MCP panel.
2. **S2 — GitHub and branding.** Preserve the request verbatim: “1- crea el proyecto en github, crea un lindo readme, y agrega el logo de hecho con gentle-ia, creo que deberas buscar en su repo el logo”. Check: `oniricosistemas/mcp-sidebar` exists publicly; README is scannable, credits Gentle AI, uses the official logo asset, and includes required upstream license notice.
3. **S3 — Engram.** Preserve the request verbatim: “2- enrola el proyecto en engram local y cloud”. Check: explicit local identity is initialized, Cloud enrollment succeeds for `mcp-sidebar`, sync succeeds, and status reports the project ready.
4. **S4 — Development.** Preserve the request verbatim: “3- arranca con el desarrollo”. Assumption: this authorizes the previously recommended extension-only MVP: a toggleable passive right overlay, honest tool-availability labels, responsive narrow-terminal fallback, theme-aware rendering, lifecycle cleanup, and no replacement of built-in `/mcp`. Check: behavior is covered through public interfaces with RED/GREEN evidence, typecheck passes, and the packaged extension loads.

## Tasks

- **T1** · S2 · inline (no Writer-rule trigger; cohesive foundation) · done · commit: `2aadc51`
- **T2** · S3 · inline (CLI enrollment and verification) · done · commit: `95fd69c`
- **T3** · S1, S4 · inline (single cohesive behavior; test-first) · done · commit: `4794b07`
- **T4** · S1-S4 · inline (integration verification and authorized GitHub publication) · done · commits: `9dd27c1`, `491c51f`, `f8f0f90`, final publication evidence commit pending

## Log

- **L1 — Original request:** “Hola master, che veo que gentle-shell no tiene un sidebar para los mcp instalado estilo como opencode /tmp/herdr-clipboard-images-1000/client-2-clipboard-1791934995413770394-0.png quisera hacer uno para gentle-shell, se puede que me recomiendas? no tengo nada, ni repo, ni código, sería un proyecto desde cero”
- **L2 — Authorized scope:** “ok perfecto, hagamos lo siguiente:
1- crea el proyecto en github, crea un lindo readme, y agrega el logo de hecho con gentle-ia, creo que deberas buscar en su repo el logo
2- enrola el proyecto en engram local y cloud
3- arranca con el desarrollo”
- **L3 — Repository decision:** User selected `oniricosistemas/mcp-sidebar` with public visibility. The repository name is currently available; GitHub CLI is authenticated as `oniricosistemas`.
- **L4 — Research:** Official upstream logo is `Gentleman-Programming/gentle-shell:assets/gentle-logo-only.png` (1254×1254 PNG). Upstream is MIT licensed; preserve its notice and avoid implying endorsement because the README uses `gentle-shell™`.
- **L5 — Engram readiness:** Installed Engram is 3.4.0. Cloud is configured at `https://engram.sastrevalls`, authentication is ready, and explicit project enrollment remains pending.
- **L6 — T1 evidence:** Created public repository `https://github.com/oniricosistemas/mcp-sidebar`, initialized `main`, switched to `feat/mcp-sidebar-mvp`, added the Pi package manifest, scannable README, MIT license, official 1254×1254 logo, and upstream notice. Structural checks and `git diff --check` passed. Rebased work-unit commit: `2aadc51`.
- **L7 — T2 evidence:** Initialized `.engram/config.json` with explicit identity `mcp-sidebar`, enrolled it against `https://engram.sastrevalls`, exported local memories, imported the one pending remote chunk, and observed `Local chunks: 2`, `Remote chunks: 2`, `Pending import: 0`. Rebased work-unit commit: `95fd69c`.
- **L8 — T3 evidence:** RED observed with `ERR_MODULE_NOT_FOUND` before the MVP modules existed. GREEN: focused Node tests and the full test script both passed 4/4; TypeScript typecheck passed after enabling `.ts` imports; `pnpm pack --dry-run` included the intended extension files. The first install downloaded all 120 packages but exited 1 because pnpm refused two transitive build scripts; `pnpm-workspace.yaml` explicitly denies both scripts, and no dependency script was executed. Rebased work-unit commit: `4794b07`.
- **L9 — Delivery budget:** Running authored change count is 551 lines excluding the generated lockfile and binary logo, so `ask-on-risk` requires a delivery-strategy selection before the next commit.
- **L10 — Delivery decision:** User selected `feature-branch-chain`; cache `delivery_strategy=auto-chain` and `chain_strategy=feature-branch-chain`. Planned slices: tracker `feat/mcp-sidebar` → foundation `chore/mcp-sidebar-foundation` → MVP `feat/mcp-sidebar-mvp`.
- **L11 — Chain prepared:** Verified default branch `main`; created tracker `feat/mcp-sidebar` at `9d051ac`, foundation child `chore/mcp-sidebar-foundation` through `95fd69c`, and MVP child `feat/mcp-sidebar-mvp` through `9dd27c1`. Rebase changed work-unit identities and the task records now use the rebased commits.
- **L12 — Native assessment correction:** Native high-risk assessment identified ordinary package files as executable. Commit `491c51f` normalized all tracked package files to mode `100644`; reassessment retained high risk only because mode changes are part of the candidate.
- **L13 — Independent verification:** First pass found no product defect but required independent S2/S3 evidence and actual Pi-host loading. Correction commit `f8f0f90` added lifecycle/inventory tests and corrected README behavior. Focused tests passed 2/2, full tests passed 6/6, typecheck and diff checks passed.
- **L14 — Blocker recheck:** GitHub independently reported the repository PUBLIC on `main`; upstream/local logo hashes matched; Engram reported enrolled with `Local chunks: 12`, `Remote chunks: 12`, `Pending import: 0`; Pi's documented `DefaultResourceLoader` loaded `src/extension.ts` with command `mcp-sidebar`, no errors, and no warnings. S2, S3, and S4 all passed. Interactive visual smoke testing remains unperformed and is not claimed.
- **L15 — Native review:** High-risk four-lens review lineage `review-c1b3f6ffdd082e93` approved the committed candidate and exact acknowledgement burned the authority. Two informational advisories remain non-blocking: duplicated visibility policy and session-start state handling; neither opened a correction.
- **L16 — Publication:** User explicitly authorized full chain publication with GitHub session `oniricosistemas`. Confirmed issue `#1` with `type:feature` and `status:approved`; pushed all three branches; opened draft tracker PR `#2` (`main` ← `feat/mcp-sidebar`), foundation PR `#3` (`feat/mcp-sidebar` ← `chore/mcp-sidebar-foundation`), and MVP PR `#4` (`chore/mcp-sidebar-foundation` ← `feat/mcp-sidebar-mvp`). No merge was requested or performed.
- **L17 — Remote readback:** All three PRs are OPEN, CLEAN, carry exactly one `type:feature` label, and CodeRabbit reported SUCCESS. PR `#2` remains draft/no-merge. GitHub reports 257 changed lines for PR `#3` and 1,555 for PR `#4`; PR `#4` documents that 424 are authored lines excluding the generated lockfile and explains the bounded cohesive overage.
- **L18 — Next:** Review and integrate child PR `#3`, then child PR `#4`, and only then make tracker PR `#2` ready. Interactive visual smoke testing remains the only skipped check and is explicitly not claimed.
