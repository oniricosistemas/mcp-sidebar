# Gentle Shell Card Groups Compatibility
Objective: Preserve native independent rail cards on current Gentle Shell while retaining the established legacy behavior on older hosts.
Branch: `fix/gentle-shell-card-groups` · Test runner: Node test runner + TypeScript typecheck · Delivery: undecided

## Specs

1. **S1 — Current card-group contract.** Preserve the report verbatim: “lo raro es que esto falla cuando instale nuestro sidebar, sin nuestro sidebar no se ven los ... y cada seccion es independiente”. Check: when the existing Gentle Shell footer exposes `cardGroups(width)`, installing MCP Sidebar preserves the original Changes, Stats, and Integrations groups, adds MCP as an independent native group, and does not introduce nested frames or right-edge ellipses.
2. **S2 — Legacy compatibility.** Preserve the correction verbatim: “ok hagamos la corrección pero manteniendo la compatibilidad para versiones anteriorea a la 4.6, como habiamos planteado al inicio”. Check: hosts without the new `cardGroups(width)` capability retain the separated framed MCP card used by the Gentle Shell 4.6 compatibility path, while older incompatible hosts and plain Pi retain the standalone legacy overlay fallback.
3. **S3 — Shared rail behavior.** Check: composed groups keep correct row offsets after visibility, collapse, and multiple participants; mouse routing, digest invalidation, identity-safe restoration, and width bounds remain unchanged.

## Tasks

- **T1** · S1-S3 · inline (shared footer contract; test-first; independent verification required for Risk item 3) · done · commit: pending

## Log

- **L1 — User report:** “lmsastre@DESKTOP-TRUI7MT:~$ gentle-shell --version
1.3.0
estoy corriendo main en una wsl (fuera del entorno donde estas vos ahora), lo raro es que esto falla cuando instale nuestro sidebar, sin nuestro sidebar no se ven los ... y cada seccion es independiente
Como aca no tiene la main, puede ver el repo?”
- **L2 — Runtime evidence:** The affected installation uses `gentle-pi@4.3.0`, `@earendil-works/pi-coding-agent@1.3.0`, and Gentle Shell commit `b6f2556540ef2ca3fd8f686a4bb458f9c7390ddb` in separate-prefix mode.
- **L3 — Root cause:** Upstream `SidebarRail.cardGroups(width)` declares independent cards on transparent rails. `src/gentle-shell-adapter.ts` replaces the native footer with a wrapper that does not forward or compose `cardGroups`, so the host falls back to one group spanning every row and reprocesses already width-shaped rows, producing nested cards and `…` truncation.
- **L4 — Authorized correction:** “ok hagamos la corrección pero manteniendo la compatibilidad para versiones anteriorea a la 4.6, como habiamos planteado al inicio”
- **L5 — RED/GREEN:** RED reproduced the current-host failure: a footer exposing `cardGroups(width)` still selected the framed 4.6 participant and the wrapper exposed no groups. GREEN composes original and participant groups with rendered-row offsets, preserves loose rows, selects native unframed MCP rows only when `cardGroups` exists, and retains the existing panel-only and standalone fallbacks. Focused tests passed 18/18; the full suite passed 50/50; TypeScript, `git diff --check`, and package dry-run passed.
- **L6 — Independent verification:** The required Risk item 3 verifier passed S1-S3. It independently compared 80 legacy renderer combinations against `origin/main` byte-for-byte, ran candidate and baseline suites/typechecks, and probed grouped loose-row offsets, visibility, collapse, mouse routing, width refresh, invalidation, and restoration. No blocker was found. Live proof on the external WSL installation remains pending after delivery.
- **L7 — Risk:** item 3, because the adapter wraps a shared Gentle Shell footer contract consumed by native rail sections; capability detection and independent compatibility verification bound the change.
