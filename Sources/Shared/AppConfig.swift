import Foundation

/// Shared identifiers used by both the app and the widget extension.
///
/// A free Apple ID cannot use App Groups, so app↔widget sharing goes entirely
/// through the shared Keychain (keychain-access-groups entitlement) instead.
public enum AppConfig {
    /// Keychain service name shared by app + widget.
    public static let keychainService = "jp.p-jihyo.GitHubProjectMenuBar"
    /// Keychain accounts for the shared values.
    public static let tokenAccount = "github-token"
    public static let projectAccount = "selected-project"
    /// Status option the widget is currently showing.
    public static let widgetStatusAccount = "widget-status"
    /// Cached board JSON so the widget can re-render instantly without a network call.
    public static let boardCacheAccount = "board-cache"

    /// WidgetKit kind identifier.
    public static let widgetKind = "GitHubProjectWidget"
}
