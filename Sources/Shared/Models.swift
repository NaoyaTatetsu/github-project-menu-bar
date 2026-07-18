import Foundation

public struct Project: Identifiable, Hashable, Codable, Sendable {
    public let id: String
    public let title: String
    public let number: Int
}

public struct StatusOption: Identifiable, Hashable, Codable, Sendable {
    public let id: String
    public let name: String
    /// GitHub single-select color enum (GRAY/BLUE/GREEN/…), may be nil.
    public let color: String?
}

public enum CardKind: String, Codable, Sendable {
    case issue, pullRequest, draftIssue, unknown

    init(typename: String?) {
        switch typename {
        case "Issue": self = .issue
        case "PullRequest": self = .pullRequest
        case "DraftIssue": self = .draftIssue
        default: self = .unknown
        }
    }
}

/// An issue/PR label shown on a card.
public struct CardLabel: Hashable, Codable, Sendable {
    public let name: String
    /// GitHub label hex color, e.g. "d73a4a" (no leading "#"), may be nil.
    public let color: String?

    public init(name: String, color: String?) {
        self.name = name
        self.color = color
    }
}

public struct Card: Identifiable, Hashable, Codable, Sendable {
    public var id: String { itemId }
    public let itemId: String
    public let title: String
    public let number: Int?
    public let url: String?
    public var statusOptionId: String?
    public let kind: CardKind
    public let labels: [CardLabel]
    /// Priority option name (e.g. "P0"), from the "Priority" single-select field.
    public let priority: String?
    /// Priority option's GitHub single-select color enum (BLUE/RED/…).
    public let priorityColor: String?
    /// End date ("End date" field), ISO "yyyy-MM-dd", date only.
    public let endDate: String?

    public init(
        itemId: String, title: String, number: Int?, url: String?,
        statusOptionId: String?, kind: CardKind,
        labels: [CardLabel] = [], priority: String? = nil,
        priorityColor: String? = nil, endDate: String? = nil
    ) {
        self.itemId = itemId
        self.title = title
        self.number = number
        self.url = url
        self.statusOptionId = statusOptionId
        self.kind = kind
        self.labels = labels
        self.priority = priority
        self.priorityColor = priorityColor
        self.endDate = endDate
    }
}

// MARK: - Date field formatting

private let projectDateParser: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyy-MM-dd"
    f.timeZone = TimeZone(identifier: "UTC")
    return f
}()

private let projectDateDisplay: DateFormatter = {
    let f = DateFormatter()
    f.dateStyle = .medium
    f.timeStyle = .none
    return f
}()

/// Format a project date field value ("yyyy-MM-dd") for display, date-only.
public func formatProjectDate(_ raw: String) -> String {
    guard let date = projectDateParser.date(from: raw) else { return raw }
    return projectDateDisplay.string(from: date)
}

public struct Board: Codable, Sendable {
    public let title: String
    public let statusFieldId: String?
    public let statusOptions: [StatusOption]
    public var cards: [Card]

    public func cards(in optionId: String?) -> [Card] {
        cards.filter { $0.statusOptionId == optionId }
    }
}
