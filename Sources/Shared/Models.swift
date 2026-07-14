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

public struct Card: Identifiable, Hashable, Codable, Sendable {
    public var id: String { itemId }
    public let itemId: String
    public let title: String
    public let number: Int?
    public let url: String?
    public var statusOptionId: String?
    public let kind: CardKind
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
