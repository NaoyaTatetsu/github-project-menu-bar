# GitHub Project Menu Bar

[English](../README.md) / 日本語

自分の **GitHub Projects (v2)** のボードを、macOSの**メニューバー**と**ウィジェット**から閲覧・編集できるネイティブアプリです。**SwiftUI** 製。

- **メニューバーパネル**: カンバンボード表示。カードを**ドラッグ**して列（Status）を変更、**右クリック**でもStatus変更、**「＋」**でタスク追加、カードをクリックでGitHubを開く。GitHub Project のビューで設定した**ソート順**に並びます。
- **ウィジェット**（通知センター／デスクトップ）: 上部に各Statusのボタンが並び、**タップするとそのStatusのタスク**が表示されます。読み取り専用で、一定間隔で更新されます。

## 技術スタック

| レイヤー | 採用 |
|---|---|
| アプリ本体 | SwiftUI `MenuBarExtra`（メニューバー常駐・Dockアイコンなし） |
| ウィジェット | WidgetKit ＋ インタラクティブ AppIntents |
| GitHub API | Projects v2 **GraphQL**（URLSession） |
| トークン／共有状態 | OS **Keychain**（本体とウィジェットで共有） |
| プロジェクト生成 | [XcodeGen](https://github.com/yonaskolb/XcodeGen)（`project.yml`） |

## ディレクトリ構成

```
project.yml            XcodeGen定義（App＋Widgetの2ターゲット、Team固定）
build.sh               CLIビルド → 署名 → /Applications へインストール → 起動
Entitlements/          App.entitlements / Widget.entitlements（サンドボックス・Keychain・ネットワーク）
Sources/
  Shared/              App と Widget の両方にコンパイルされる共通コード
    AppConfig / TokenStore（＋SharedStore, BoardCache）/ Models
    GitHubAPI（GraphQL＋ビューのソート再現）/ StatusColor
    SelectStatusIntent（ウィジェットのボタン用Intent。本体にも必要なのでShared）
  App/                 MenuBarExtra アプリ: App / BoardViewModel / MenuContent / BoardView / SettingsView
  Widget/              WidgetKit: BoardProvider / BoardWidgetView
  App/Assets.xcassets  アプリアイコン（AppIcon）
```

`.xcodeproj` と `Generated/` は XcodeGen が生成する成果物なので **gitignore** しています。**source of truth は `project.yml`** です。

## 必要なもの

- **Xcode** 本体（フル版。CommandLine Toolsのみでは不可）
- **XcodeGen**（`brew install xcodegen`）

## ビルド＆インストール（Xcodeを開かずに実行）

```bash
./build.sh
```

`build.sh` は次を自動で行います。

1. `xcodegen generate`（プロジェクト再生成）
2. `xcodebuild`（Release・**署名付き**）でアプリ＋ウィジェットをビルド
3. `/Applications/GitHubProjectMenuBar.app` に上書きインストール
4. アプリを起動

> **無料のPersonal Team**（`project.yml` の `DEVELOPMENT_TEAM`）で署名しています。
> 無料Teamのプロビジョニングは**約7日で失効**するので、切れたら `./build.sh` を再実行してください。

## 使い方

1. メニューバーのアイコンをクリック → **⚙ 設定** → GitHub の **Classic PAT**（`project` スコープ。プライベートリポジトリのIssue/PRを扱うなら `repo` も）を貼り付け
2. プロジェクトを選択 → ボードが読み込まれます
3. **ウィジェットを編集**（通知センター／デスクトップ）から「GitHub Project」を追加

### トークンについて
- トークンは **OS Keychain** に保存され、ソースやファイルには平文で残りません。
- 本体とウィジェットは `keychain-access-groups` で同じ項目を共有します（無料Apple IDでも動作。App Groupは有料が必要なため未使用）。

## テスト

共通ロジック（ビューのソート再現・モデル）のユニットテストがあります。

```bash
./test.sh
```

## Xcodeで開く場合（任意）

```bash
xcodegen generate && open GitHubProjectMenuBar.xcodeproj
```

## 補足・既知の制約

- **手動ドラッグの並び順**（ソート未設定）はGitHub APIが公開しておらず再現できません。ビューで**フィールドソート**を設定している場合のみ順序が一致します。
- ウィジェットは WidgetKit の仕様上**読み取り専用**で、更新はタイムライン（数十分間隔）に依存します。Statusボタンの切り替えはキャッシュから即時描画されます。
- **配布不可・自分のMac専用**（無料Team）。他人が使うには各自の Apple ID / Team ID に置き換えてビルドが必要です。
