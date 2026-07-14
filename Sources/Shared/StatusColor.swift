import SwiftUI

/// Maps GitHub single-select color enums to SwiftUI colors (mid tones that read
/// on both light and dark backgrounds).
public func statusColor(_ enumName: String?) -> Color {
    switch enumName {
    case "GRAY": return Color(red: 0.55, green: 0.58, blue: 0.62)
    case "BLUE": return Color(red: 0.33, green: 0.61, blue: 0.96)
    case "GREEN": return Color(red: 0.34, green: 0.67, blue: 0.35)
    case "YELLOW": return Color(red: 0.85, green: 0.67, blue: 0.25)
    case "ORANGE": return Color(red: 0.88, green: 0.51, blue: 0.24)
    case "RED": return Color(red: 0.90, green: 0.33, blue: 0.29)
    case "PINK": return Color(red: 0.89, green: 0.46, blue: 0.68)
    case "PURPLE": return Color(red: 0.60, green: 0.43, blue: 0.89)
    default: return Color(red: 0.82, green: 0.84, blue: 0.87)
    }
}
