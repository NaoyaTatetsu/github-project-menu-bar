# GitHub Project Menu Bar

A macOS menu bar app (GitBoard-style) to browse and edit your **private GitHub Projects (v2)** boards. Built with **Tauri v2 + React + TypeScript**.

Click the tray icon → a compact kanban panel drops down. Drag cards between columns to update their **Status**; the change is written back to GitHub via the Projects v2 GraphQL API.

## Stack

| Layer | Choice |
|---|---|
| Shell | Tauri v2 (`tray-icon`, `tauri-plugin-positioner`) |
| UI | React 19 + TypeScript + Vite + Tailwind CSS |
| Drag & drop | `@dnd-kit` |
| Data | `@tanstack/react-query` + `graphql-request` |
| GitHub API | Projects v2 **GraphQL** (`viewer.projectsV2`, `updateProjectV2ItemFieldValue`) |
| Token storage | **OS keychain** via the `keyring` crate (Rust commands) |

## Prerequisites

All versions are pinned in [`mise.toml`](./mise.toml): **node**, **bun**,
**rust**, and **typescript** (via mise's `npm:` backend).
Install [mise](https://mise.jdx.dev), then:

```bash
mise install    # installs node, bun, rust, and typescript 7
```

> - mise's `rust` delegates to `rustup`, so the toolchain lives in `~/.rustup`
>   but its version is controlled by `mise.toml`.
> - `typescript` is **not** a package.json dependency — it's provided on PATH by
>   mise (`npm:typescript`). Point your editor's TS SDK at the mise shim if you
>   want it to use the same version.

## Develop

```bash
bun install
bun tauri dev
```

The tray icon appears in the menu bar. On first launch, open **⚙ Settings** and paste a GitHub token.

### GitHub token (current auth: PAT)

Create a **Fine-grained personal access token** with:

- **Repository access**: the repos your project draws from (or *All*)
- **Permissions → Projects**: **Read and write**

Paste it into the app's settings screen. It's verified against `viewer.login` and stored locally.

The token is stored in the **OS keychain** (macOS Keychain via the `keyring`
crate) — never in plaintext on disk. Any token left over from an older build's
plaintext `settings.json` is migrated into the keychain automatically on launch.

> ⚠️ **Before distributing**, replace the pasted-PAT flow with **GitHub OAuth Device Flow** (no client secret needed for desktop). See `TODO` below.

## Build

```bash
bun tauri build
```

Produces a `.app` / `.dmg` under `src-tauri/target/release/bundle/`. For distribution outside the App Store you'll need to **codesign + notarize** with an Apple Developer ID.

## Project layout

```
src/                 React frontend
  lib/github.ts      Projects v2 GraphQL queries & mutations
  lib/store.ts       keychain-backed token + selected-project persistence
  hooks/useBoard.ts  react-query data hooks (optimistic status updates)
  components/        Board / Column / Card / Settings
src-tauri/
  src/lib.rs         tray icon + panel toggle, dock hidden, keychain commands
  tauri.conf.json    frameless, transparent, always-on-top panel window
  capabilities/      permission grants for the panel window
```

## TODO / roadmap

- [ ] OAuth Device Flow auth (for distribution)
- [x] Store token in the OS keychain (`keyring` crate)
- [ ] Edit card title / assignees / other fields, not just Status
- [ ] Create draft issues from the panel
- [ ] Global hotkey to toggle the panel
- [ ] Auto-refresh / polling
- [ ] App icon + tray icon polish (current icons are placeholders from `scripts/gen-icon.mjs`)
```
