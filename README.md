<p align="center">
  <img src="docs/images/icon.png" width="120" alt="GitHub Project Menu Bar icon">
</p>

<h1 align="center">GitHub Project Menu Bar</h1>

<p align="center">
  Browse and edit your private <b>GitHub Projects (v2)</b> boards from the macOS
  menu bar — with a Notification Center / desktop widget.
</p>

<p align="center">English / <a href="docs/README.ja.md">日本語</a></p>

## Screenshots

**Menu bar panel** — a kanban board. Drag cards between columns to change Status,
right-click to change Status, "+" to add a task, click a card to open it on GitHub.

<p align="center">
  <img src="docs/images/menubar.png" width="720" alt="Menu bar kanban panel">
</p>

**Widget** — status buttons across the top; tap one to show that status's tasks.

<p align="center">
  <img src="docs/images/widget.png" width="380" alt="Notification Center widget">
</p>

## Features

- **Kanban board** in the menu bar: view, drag-and-drop Status changes, add tasks (draft issues), open items on GitHub.
- **Sorted like GitHub**: cards follow the project view's configured sort.
- **Status colors**: each card shows its Status color dot.
- **Interactive widget**: pick a status, see its tasks — read-only, auto-refreshing.
- **Menu-bar-only**: no Dock icon; the panel drops down from the menu bar.

## Stack

| Layer | Choice |
|---|---|
| App | SwiftUI `MenuBarExtra` (no Dock icon) |
| Widget | WidgetKit + interactive AppIntents |
| GitHub API | Projects v2 **GraphQL** (URLSession) |
| Token / shared state | OS **Keychain** (shared between app & widget) |
| Project generation | [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`project.yml`) |

No third-party runtime dependencies (Foundation / SwiftUI / WidgetKit / AppIntents / Security only).

## Layout

```
project.yml            XcodeGen spec (app + widget + tests, one team)
build.sh               CLI build → sign → install to /Applications → launch
test.sh                CLI unit tests
Entitlements/          App.entitlements / Widget.entitlements
Sources/
  Shared/              compiled into BOTH targets
    AppConfig / TokenStore(+SharedStore, BoardCache) / Models
    GitHubAPI (GraphQL + view-sort replication) / StatusColor / SelectStatusIntent
  App/                 MenuBarExtra app + Assets.xcassets (AppIcon)
  Widget/              WidgetKit: provider + views
Tests/                 Shared-logic unit tests
```

The `.xcodeproj` and `Generated/` are produced by XcodeGen and git-ignored;
`project.yml` is the source of truth.

## Prerequisites

- Full **Xcode**
- **XcodeGen** — `brew install xcodegen`

## Build & install (no need to open Xcode)

```bash
./build.sh
```

Regenerates the project, builds a signed Release, installs it to
`/Applications/GitHubProjectMenuBar.app`, and launches it.

> Signed with a **free personal team** (`DEVELOPMENT_TEAM` in `project.yml`).
> Free provisioning profiles expire after ~7 days — just re-run `./build.sh`.

## Setup

1. Click the menu bar icon → **⚙ Settings** → paste a GitHub **classic PAT** with
   the `project` scope (and `repo` if your board draws from private repos).
2. Pick a project → the board loads.
3. Add the widget from **Edit Widgets** (Notification Center / desktop).

The token is stored in the OS **Keychain** and shared with the widget via a
keychain access group (works on a free Apple ID; no App Group needed).

## Tests

```bash
./test.sh
```

Unit tests cover the Shared logic (view-sort replication, models).

## Open in Xcode (optional)

```bash
xcodegen generate && open GitHubProjectMenuBar.xcodeproj
```

## Notes & limitations

- **Manual drag order** (no configured sort) can't be reproduced — the GitHub API
  doesn't expose it. Only **field-based sorts** match.
- The widget is **read-only** (WidgetKit); it refreshes on a timeline, and status
  switching renders instantly from a cache.
- Built for **personal use on your own Mac** with a free team — not for
  distribution. Others must build with their own Apple ID / Team ID.
