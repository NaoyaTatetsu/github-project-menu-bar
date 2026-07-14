import XCTest

@testable import GitHubProjectMenuBar

/// Tests for the view-sort replication logic (`sortedCards`).
final class SortTests: XCTestCase {
    private func card(_ id: String, _ title: String = "") -> Card {
        Card(itemId: id, title: title, number: nil, url: nil, statusOptionId: nil, kind: .draftIssue)
    }

    func testEmptySortKeepsOriginalOrder() {
        let cards = [card("a"), card("b"), card("c")]
        XCTAssertEqual(sortedCards(cards, by: [], values: [:]).map(\.itemId), ["a", "b", "c"])
    }

    func testNumberAscending() {
        let cards = [card("a"), card("b"), card("c")]
        let values: [String: [String: SortVal]] = [
            "a": ["Priority": .num(3)],
            "b": ["Priority": .num(1)],
            "c": ["Priority": .num(2)],
        ]
        let spec = SortSpec(fieldName: "Priority", direction: "ASC", dataType: "NUMBER", optionOrder: [])
        XCTAssertEqual(sortedCards(cards, by: [spec], values: values).map(\.itemId), ["b", "c", "a"])
    }

    func testNumberDescending() {
        let cards = [card("a"), card("b"), card("c")]
        let values: [String: [String: SortVal]] = [
            "a": ["Priority": .num(3)],
            "b": ["Priority": .num(1)],
            "c": ["Priority": .num(2)],
        ]
        let spec = SortSpec(fieldName: "Priority", direction: "DESC", dataType: "NUMBER", optionOrder: [])
        XCTAssertEqual(sortedCards(cards, by: [spec], values: values).map(\.itemId), ["a", "c", "b"])
    }

    func testTitleUsesCardTitleNaturalOrder() {
        let cards = [card("a", "Banana"), card("b", "apple"), card("c", "cherry")]
        let spec = SortSpec(fieldName: "Title", direction: "ASC", dataType: "TITLE", optionOrder: [])
        // localizedStandardCompare is case-insensitive/natural: apple, Banana, cherry
        XCTAssertEqual(sortedCards(cards, by: [spec], values: [:]).map(\.itemId), ["b", "a", "c"])
    }

    func testSingleSelectUsesConfiguredOptionOrder() {
        let cards = [card("a"), card("b"), card("c")]
        let values: [String: [String: SortVal]] = [
            "a": ["Status": .str("opt-done")],
            "b": ["Status": .str("opt-todo")],
            "c": ["Status": .str("opt-doing")],
        ]
        let spec = SortSpec(
            fieldName: "Status", direction: "ASC", dataType: "SINGLE_SELECT",
            optionOrder: ["opt-todo", "opt-doing", "opt-done"])
        XCTAssertEqual(sortedCards(cards, by: [spec], values: values).map(\.itemId), ["b", "c", "a"])
    }

    func testMissingValuesSortLastRegardlessOfDirection() {
        let cards = [card("a"), card("b"), card("c")]
        let values: [String: [String: SortVal]] = [
            "a": ["N": .num(1)],
            // "b" has no value → sorts last
            "c": ["N": .num(2)],
        ]
        let asc = SortSpec(fieldName: "N", direction: "ASC", dataType: "NUMBER", optionOrder: [])
        XCTAssertEqual(sortedCards(cards, by: [asc], values: values).map(\.itemId), ["a", "c", "b"])
        let desc = SortSpec(fieldName: "N", direction: "DESC", dataType: "NUMBER", optionOrder: [])
        XCTAssertEqual(sortedCards(cards, by: [desc], values: values).map(\.itemId), ["c", "a", "b"])
    }

    func testMultiLevelSort() {
        let cards = [card("a"), card("b"), card("c"), card("d")]
        let values: [String: [String: SortVal]] = [
            "a": ["S": .str("s1"), "P": .num(2)],
            "b": ["S": .str("s1"), "P": .num(1)],
            "c": ["S": .str("s2"), "P": .num(5)],
            "d": ["S": .str("s2"), "P": .num(1)],
        ]
        let primary = SortSpec(
            fieldName: "S", direction: "ASC", dataType: "SINGLE_SELECT", optionOrder: ["s1", "s2"])
        let secondary = SortSpec(fieldName: "P", direction: "ASC", dataType: "NUMBER", optionOrder: [])
        // group s1 (b:1, a:2) then s2 (d:1, c:5)
        XCTAssertEqual(
            sortedCards(cards, by: [primary, secondary], values: values).map(\.itemId),
            ["b", "a", "d", "c"])
    }

    func testDateSortsChronologically() {
        let cards = [card("a"), card("b"), card("c")]
        let values: [String: [String: SortVal]] = [
            "a": ["Due": .str("2026-03-10")],
            "b": ["Due": .str("2026-01-05")],
            "c": ["Due": .str("2026-02-20")],
        ]
        let spec = SortSpec(fieldName: "Due", direction: "ASC", dataType: "DATE", optionOrder: [])
        XCTAssertEqual(sortedCards(cards, by: [spec], values: values).map(\.itemId), ["b", "c", "a"])
    }
}
