<div align="center">
  <img src="assets/gentle-logo-only.png" alt="Gentle AI logo" width="132" />

# MCP Sidebar for Pi

**See the MCP tools available to your Pi session without leaving the conversation.**

[![Built for Pi](https://img.shields.io/badge/built%20for-Pi-6f42c1)](https://github.com/badlogic/pi-mono)
[![Gentle Shell](https://img.shields.io/badge/works%20with-gentle--shell-22c55e)](https://github.com/Gentleman-Programming/gentle-shell)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

> [!IMPORTANT]
> In compatible Gentle Shell fullscreen sessions, the panel joins the native Status rail and flows
> directly below it. Plain Pi, narrow terminals, and incompatible hosts keep the passive overlay fallback.

<div align="center">
  <img src="assets/mcp-sidebar-tui.svg" alt="MCP Sidebar showing eight MCP tool namespaces in Pi" width="420" />
  <br />
  <sub>Sanitized vector crop transcribed from a live Pi 1.2.0 TUI session.</sub>
</div>

## Quick start

```bash
pi install git:github.com/oniricosistemas/mcp-sidebar
```

Restart Pi or gentle-shell. The panel appears automatically in interactive TUI sessions.
Toggle it at any time with:

```text
/mcp-sidebar
```

In fullscreen mode, click a namespace row to open its tool names and descriptions.
The keyboard path works in every interactive TUI mode:

```text
/mcp-tools
/mcp-tools context7
```

Use arrow keys or Page Up/Page Down to scroll tool details and Escape to close them.
The sidebar and details dialog use semantic colors from the currently selected Pi theme.

Collapse or expand the panel by clicking its header, running:

```text
/mcp-sidebar-collapse
```

or pressing `Ctrl+Shift+M`. Some legacy terminals cannot distinguish that modified key,
so the command is the reliable fallback. `/mcp-sidebar` continues to hide or show the panel
without changing its collapsed state.

Use Pi's built-in `/mcp` screen for authoritative connection details,
authentication, reconnection, and configuration.

## What it shows

| Signal | Meaning |
|---|---|
| `tools registered` | Pi currently exposes one or more tools from this MCP namespace. |
| `connection status: /mcp` | Open Pi's authoritative MCP screen for transport and authentication state. |

Registered tools do not prove that the underlying transport is still connected. The extension
therefore directs connection checks to `/mcp` and never claims connected state from inventory alone.

## Design goals

- **Glanceable:** server namespaces and tool counts fit in a compact panel.
- **Non-blocking:** neither the native rail participant nor the overlay fallback captures editor focus.
- **Responsive:** Gentle Shell stacks participating rail panels by rendered height; narrow terminals fall back to the overlay.
- **Collapsible:** header click, `/mcp-sidebar-collapse`, and `Ctrl+Shift+M` reduce MCP to one summary row.
- **Theme-aware:** frame, text, selection, and details colors follow the active Pi theme.
- **Inspectable:** fullscreen row clicks and `/mcp-tools` reveal tool names and descriptions.
- **Honest:** availability is reported separately from connection health.

## Local development

Requirements: Node.js 22.19 or newer, pnpm 11, and Pi 1.2 or newer.

```bash
git clone https://github.com/oniricosistemas/mcp-sidebar.git
cd mcp-sidebar
pnpm install
pnpm check
pi -e .
```

## Architecture

```text
src/
├── extension.ts              # Pi lifecycle, commands, and presentation switching
├── gentle-shell-adapter.ts   # Guarded native-rail integration and stacked participants
├── mcp-view-model.ts         # MCP namespace discovery and honest labels
├── sidebar.ts                # Width-safe TUI rendering and row interaction
└── tool-details.ts           # Scrollable namespace tool descriptions
```

The extension observes Pi's public tool inventory. Because built-in MCP connections register tools
asynchronously, it samples that inventory once per second and renders only when it changes.

Gentle Shell integration is feature-detected through its terminal-owned rail state. The adapter
composes the existing Status footer by identity, routes mouse coordinates using actual rendered
heights, and restores the prior owner on disposal. If the rail is absent or stops owning the layout
—for example after a narrow resize—the passive overlay automatically becomes visible again.

## Roadmap

- [x] Project and package foundation
- [x] Responsive passive sidebar MVP
- [x] Runtime screenshots and visual tuning
- [x] Feature-detected Gentle Shell rail stacking with standalone fallback
- [ ] Upstream proposal for a documented native sidebar slot
- [ ] Upstream proposal for sanitized MCP status events

## Gentle AI attribution

This extension was designed and developed with
[Gentle AI / gentle-shell](https://github.com/Gentleman-Programming/gentle-shell).
The Gentle Shell logo remains an upstream asset and does not imply endorsement.
See [Third-party notices](THIRD_PARTY_NOTICES.md) for provenance and license text.

## License

The project source is available under the [MIT License](LICENSE).
