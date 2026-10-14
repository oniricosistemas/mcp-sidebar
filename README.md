<div align="center">
  <img src="assets/gentle-logo-only.png" alt="Gentle AI logo" width="132" />

# MCP Sidebar for Pi

**See the MCP tools available to your Pi session without leaving the conversation.**

[![Built for Pi](https://img.shields.io/badge/built%20for-Pi-6f42c1)](https://github.com/badlogic/pi-mono)
[![Gentle Shell](https://img.shields.io/badge/works%20with-gentle--shell-22c55e)](https://github.com/Gentleman-Programming/gentle-shell)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

> [!IMPORTANT]
> This project is an early MVP. Pi currently exposes overlays, not a width-reserving sidebar slot,
> so the panel behaves as a responsive right-side overlay.

## Quick start

```bash
pi install git:github.com/oniricosistemas/mcp-sidebar
```

Restart Pi or gentle-shell, then run:

```text
/mcp-sidebar
```

Run the same command again to hide the panel. Use Pi's built-in `/mcp` screen for
authoritative connection details, authentication, reconnection, and configuration.

## What it shows

| Signal | Meaning |
|---|---|
| `available` | Pi currently exposes one or more tools from this MCP namespace. |
| `no tools` | The namespace is known but no callable tools are currently exposed. |
| `status unknown` | Pi's public extension API cannot prove the transport is connected. |

The extension deliberately avoids claiming a server is connected when it can only see
registered tools. It also leaves Pi's built-in `/mcp` command untouched.

## Design goals

- **Glanceable:** server namespaces and tool counts fit in a compact panel.
- **Non-blocking:** the overlay does not capture keyboard focus.
- **Responsive:** narrow terminals fall back without covering the editor.
- **Theme-aware:** colors follow the active Pi theme.
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
├── extension.ts       # Pi lifecycle and /mcp-sidebar command
├── mcp-view-model.ts  # MCP namespace discovery and honest labels
└── sidebar.ts         # Width-safe TUI rendering
```

The MVP observes Pi's public tool inventory. A future native version can use a
width-reserving layout slot and sanitized MCP runtime-status subscription if Pi exposes them.

## Roadmap

- [x] Project and package foundation
- [ ] Responsive passive sidebar MVP
- [ ] Runtime screenshots and visual tuning
- [ ] Upstream proposal for a native sidebar slot
- [ ] Upstream proposal for sanitized MCP status events

## Gentle AI attribution

This extension was designed and developed with
[Gentle AI / gentle-shell](https://github.com/Gentleman-Programming/gentle-shell).
The Gentle Shell logo remains an upstream asset and does not imply endorsement.
See [Third-party notices](THIRD_PARTY_NOTICES.md) for provenance and license text.

## License

The project source is available under the [MIT License](LICENSE).
