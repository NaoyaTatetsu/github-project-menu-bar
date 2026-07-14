import SwiftUI

@main
struct GitHubProjectMenuBarApp: App {
    var body: some Scene {
        MenuBarExtra {
            MenuContentView()
                .frame(width: 720, height: 480)
        } label: {
            Image(systemName: "rectangle.split.3x1")
        }
        .menuBarExtraStyle(.window)
    }
}
