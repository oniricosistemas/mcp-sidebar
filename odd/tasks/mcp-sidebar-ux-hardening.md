# MCP Sidebar UX Hardening
Objective: Validate the merged v0.1 sidebar in a real Pi TUI and harden only evidenced rendering and lifecycle edge cases.
Branch: `feat/ux-hardening-v0.1` · Test runner: Node test runner + TypeScript typecheck · Delivery: undecided

## Specs

1. **S1 — Continue the project.** Preserve the request verbatim: “ok, continuemos con el proyecto entonces, que mas queda?” Check: identify the remaining post-MVP work without reopening completed MVP requirements.
2. **S2 — Selected milestone.** Preserve the selected option verbatim: “Validar y endurecer UX v0.1 (recomendado)” and its description: “Smoke real, screenshots y cobertura de resize, nombres largos, overflow y reinicio de sesión.” Check: capture real interactive evidence, add one public-interface RED test per confirmed rule, fix only reproduced failures, and document truthful results.

## Tasks

- **T1** · S1-S2 · inline (real TUI baseline and bounded evidence capture) · done · commit: pending
- **T2** · S2 · inline (reproduce the real MCP inventory mismatch and determine the public-API route test-first) · pending · commit: pending
- **T3** · S2 · inline (test-first rendering edge hardening) · pending · commit: pending
- **T4** · S2 · inline (test-first repeated-session lifecycle hardening) · pending · commit: pending
- **T5** · S2 · inline (final interactive proof, screenshots, and documentation) · pending · commit: pending

## Log

- **L1 — Original request:** “ok, continuemos con el proyecto entonces, que mas queda?”
- **L2 — Decision:** User selected “Validar y endurecer UX v0.1 (recomendado)” described as “Smoke real, screenshots y cobertura de resize, nombres largos, overflow y reinicio de sesión.”
- **L3 — Audit:** No P0 blocker remains. Explicit gaps are interactive TUI proof and runtime screenshots. Observable but unconfirmed edge cases are long labels losing counts, many-server height overflow, and repeated `session_start` after a hidden overlay. No repository CI exists, but CI/release work is outside this selected milestone.
- **L4 — T1 interactive baseline:** Launched the extension in a real 120×40 tmux-backed Pi TUI. On Pi 1.2.0, the overlay rendered, `/mcp-sidebar` hide/show worked, normal editor input retained focus, resizing to 99 columns hid the overlay, resizing to 100 restored it, and Pi's built-in `/mcp` screen opened without being replaced. A host-local missing `Gentleman-Sexy` theme warning fell back to the system theme and is unrelated to this repository.
- **L5 — Confirmed inventory mismatch:** In the same Pi 1.2.0 session, the sidebar rendered `No MCP tools available` while built-in `/mcp` displayed eight connected deferred servers with tool counts. This is now the first hardening target. An initial smoke on global Pi 0.81.1 was discarded for authoritative built-in `/mcp` evidence because the project and gentle-shell use Pi 1.2.0.
