import SwiftUI
import WidgetKit

@main
struct ProjectWidgetBundle: WidgetBundle {
    var body: some Widget {
        ProjectWidget()
    }
}

struct ProjectWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: AppConfig.widgetKind, provider: BoardProvider()) { entry in
            BoardWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("GitHub Project")
        .description("プロジェクトボードの概要を表示します。")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}
