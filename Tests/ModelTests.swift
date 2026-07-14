import XCTest

@testable import GitHubProjectMenuBar

final class ModelTests: XCTestCase {
    func testCardKindFromTypename() {
        XCTAssertEqual(CardKind(typename: "Issue"), .issue)
        XCTAssertEqual(CardKind(typename: "PullRequest"), .pullRequest)
        XCTAssertEqual(CardKind(typename: "DraftIssue"), .draftIssue)
        XCTAssertEqual(CardKind(typename: "Whatever"), .unknown)
        XCTAssertEqual(CardKind(typename: nil), .unknown)
    }

    func testBoardCardsGroupingByStatus() {
        let cards = [
            Card(itemId: "1", title: "a", number: nil, url: nil, statusOptionId: "todo", kind: .issue),
            Card(itemId: "2", title: "b", number: nil, url: nil, statusOptionId: nil, kind: .draftIssue),
            Card(itemId: "3", title: "c", number: nil, url: nil, statusOptionId: "todo", kind: .issue),
        ]
        let board = Board(
            title: "T", statusFieldId: "f",
            statusOptions: [StatusOption(id: "todo", name: "Todo", color: "BLUE")],
            cards: cards)

        XCTAssertEqual(board.cards(in: "todo").map(\.itemId), ["1", "3"])
        XCTAssertEqual(board.cards(in: nil).map(\.itemId), ["2"])
        XCTAssertTrue(board.cards(in: "missing").isEmpty)
    }

    func testBoardCodableRoundTrip() throws {
        let board = Board(
            title: "T", statusFieldId: "f",
            statusOptions: [StatusOption(id: "s", name: "S", color: "GREEN")],
            cards: [
                Card(itemId: "1", title: "hello", number: 42, url: "https://example.com",
                     statusOptionId: "s", kind: .issue)
            ])
        let data = try JSONEncoder().encode(board)
        let decoded = try JSONDecoder().decode(Board.self, from: data)
        XCTAssertEqual(decoded.title, "T")
        XCTAssertEqual(decoded.cards.first?.number, 42)
        XCTAssertEqual(decoded.cards.first?.kind, .issue)
        XCTAssertEqual(decoded.statusOptions.first?.color, "GREEN")
    }
}
