import AppIntents
import WidgetKit

/// Tapped from a status button in the widget. macOS runs a widget button's
/// intent in the *app* process, so this type must be compiled into BOTH the app
/// and the widget — hence it lives in Shared.
///
/// It remembers which status column to show, then reloads the widget timeline
/// so the view re-renders (instantly, from the cached board).
public struct SelectStatusIntent: AppIntent {
    public static var title: LocalizedStringResource = "Show Status"
    public static var isDiscoverable: Bool = false

    @Parameter(title: "Option ID")
    public var optionId: String

    public init() {}
    public init(optionId: String) { self.optionId = optionId }

    public func perform() async throws -> some IntentResult {
        SharedStore.widgetSelectedStatus = optionId
        WidgetCenter.shared.reloadTimelines(ofKind: AppConfig.widgetKind)
        return .result()
    }
}
