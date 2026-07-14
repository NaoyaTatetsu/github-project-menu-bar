# GitHub Project Menu Bar

English / [日本語](docs/README.ja.md)

A native macOS **menu bar app + WidgetKit widget** to browse and edit your
private **GitHub Projects (v2)** boards. Built with **SwiftUI**.

- **Menu bar panel**: kanban board — drag cards between columns to change Status,
  right-click to change Status, "+" to add a task, click a card to open it on
  GitHub. Sorted to match the project view's configured sort.
- **Widget** (Notification Center / desktop): status buttons across the top; tap
  one to show that status's tasks. Read-only, refreshes on a timeline.

## Stack

| Layer | Choice |
|---|---|
| App | SwiftUI `MenuBarExtra` (menu-bar-only, no Dock icon) |
| Widget | WidgetKit + interactive AppIntents |
| GitHub API | Projects v2 **GraphQL** (URLSession) |
| Token / shared state | OS **Keychain** (shared between app & widget) |
| Project generation | [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`project.yml`) |

## Layout

```
project.yml            XcodeGen spec (app + widget targets, one team)
build.sh               CLI build → sign → install to /Applications → launch
Entitlements/          App.entitlements / Widget.entitlements (sandbox, keychain, network)
Sources/
  Shared/              compiled into BOTH targets
    AppConfig / TokenStore(+SharedStore, BoardCache) / Models
    GitHubAPI (GraphQL + view-sort replication) / StatusColor
    SelectStatusIntent (widget button intent — must be in the app too)
  App/                 MenuBarExtra app: App / BoardViewModel / MenuContent / BoardView / SettingsView
  Widget/              WidgetKit: BoardProvider / BoardWidgetView
```

The `.xcodeproj` and `Generated/` are produced by XcodeGen and are git-ignored;
`project.yml` is the source of truth.

## Prerequisites

- Full **Xcode** installed
- **XcodeGen** (`brew install xcodegen`)

## Build & install (no need to open Xcode)

```bash
./build.sh
```

This regenerates the project, builds a signed Release, installs it to
`/Applications/GitHubProjectMenuBar.app`, and launches it.

> Signed with a **free personal team** (`DEVELOPMENT_TEAM` in `project.yml`).
> Free provisioning profiles expire after ~7 days — just re-run `./build.sh`.

## Setup

1. Click the menu bar icon → **⚙ Settings** → paste a GitHub **classic PAT**
   with the `project` scope (and `repo` if your board draws from private repos).
2. Pick a project → the board loads.
3. Add the widget from **Edit Widgets** (Notification Center / desktop).

## Open in Xcode (optional)

```bash
xcodegen generate && open GitHubProjectMenuBar.xcodeproj
```
