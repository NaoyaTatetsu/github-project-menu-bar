import Foundation

// MARK: - Sort (replicating the GitHub Project view's configured sort)

// (internal, not fileprivate, so the unit tests can reach them via @testable)

/// One level of the view's sort configuration.
struct SortSpec: Equatable {
    let fieldName: String
    let direction: String  // "ASC" / "DESC"
    let dataType: String  // TITLE / TEXT / NUMBER / DATE / SINGLE_SELECT / ITERATION
    let optionOrder: [String]  // single-select option ids, in configured order
}

/// A comparable value pulled from an item's field.
enum SortVal: Equatable {
    case str(String)
    case num(Double)
    case none
}

/// Sort cards by the view's multi-level sort spec. `values[itemId][fieldName]`
/// holds each card's field values. Pure function — the unit under test.
func sortedCards(
    _ cards: [Card], by sortBy: [SortSpec], values: [String: [String: SortVal]]
) -> [Card] {
    guard !sortBy.isEmpty else { return cards }
    return cards.sorted { a, b in
        for spec in sortBy {
            let c = compareSort(sortKey(a, spec, values[a.itemId]),
                                sortKey(b, spec, values[b.itemId]), spec)
            if c != 0 { return c < 0 }
        }
        return false
    }
}

/// Value used to sort a card for a given spec (TITLE uses the card title).
func sortKey(_ card: Card, _ spec: SortSpec, _ values: [String: SortVal]?) -> SortVal {
    if spec.dataType == "TITLE" { return .str(card.title) }
    return values?[spec.fieldName] ?? SortVal.none
}

/// Negative if a < b, positive if a > b, 0 if equal (empty values sort last).
func compareSort(_ a: SortVal, _ b: SortVal, _ spec: SortSpec) -> Int {
    switch (a, b) {
    case (.none, .none): return 0
    case (.none, _): return 1
    case (_, .none): return -1
    default: break
    }

    var c = 0
    switch spec.dataType {
    case "SINGLE_SELECT":
        if case let .str(av) = a, case let .str(bv) = b {
            let ai = spec.optionOrder.firstIndex(of: av) ?? Int.max
            let bi = spec.optionOrder.firstIndex(of: bv) ?? Int.max
            c = ai == bi ? 0 : (ai < bi ? -1 : 1)
        }
    case "NUMBER":
        if case let .num(av) = a, case let .num(bv) = b {
            c = av == bv ? 0 : (av < bv ? -1 : 1)
        }
    default:  // TEXT / TITLE / DATE / ITERATION → string
        if case let .str(av) = a, case let .str(bv) = b {
            switch av.localizedStandardCompare(bv) {
            case .orderedAscending: c = -1
            case .orderedDescending: c = 1
            case .orderedSame: c = 0
            }
        }
    }
    return spec.direction == "DESC" ? -c : c
}

public enum APIError: LocalizedError {
    case graphql(String)
    case badResponse

    public var errorDescription: String? {
        switch self {
        case .graphql(let m): return m
        case .badResponse: return "Unexpected response from GitHub"
        }
    }
}

public struct GitHubAPI: Sendable {
    private static let endpoint = URL(string: "https://api.github.com/graphql")!

    // MARK: - Transport

    private struct GraphQLResponse<T: Decodable>: Decodable {
        let data: T?
        let errors: [GraphQLError]?
    }
    private struct GraphQLError: Decodable { let message: String }

    private static func run<T: Decodable>(
        _ token: String,
        query: String,
        variables: [String: Any] = [:],
        as: T.Type
    ) async throws -> T {
        var req = URLRequest(url: endpoint)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("GitHubProjectMenuBar", forHTTPHeaderField: "User-Agent")
        req.httpBody = try JSONSerialization.data(
            withJSONObject: ["query": query, "variables": variables])

        let (data, _) = try await URLSession.shared.data(for: req)
        let decoded = try JSONDecoder().decode(GraphQLResponse<T>.self, from: data)
        // Keep partial data when present (matches read-access edge cases).
        if let d = decoded.data { return d }
        if let msg = decoded.errors?.first?.message { throw APIError.graphql(msg) }
        throw APIError.badResponse
    }

    // MARK: - Queries

    public static func verifyLogin(_ token: String) async throws -> String {
        struct R: Decodable { let viewer: Viewer; struct Viewer: Decodable { let login: String } }
        let r = try await run(token, query: "query { viewer { login } }", as: R.self)
        return r.viewer.login
    }

    public static func listProjects(_ token: String) async throws -> [Project] {
        struct R: Decodable {
            let viewer: Viewer
            struct Viewer: Decodable { let projectsV2: Conn }
            struct Conn: Decodable { let nodes: [Node] }
            struct Node: Decodable {
                let id: String; let title: String; let number: Int; let closed: Bool
            }
        }
        let query = """
        query($first:Int!){ viewer { projectsV2(first:$first, orderBy:{field:TITLE, direction:ASC}) { nodes { id title number closed } } } }
        """
        let r = try await run(token, query: query, variables: ["first": 30], as: R.self)
        return r.viewer.projectsV2.nodes
            .filter { !$0.closed }
            .map { Project(id: $0.id, title: $0.title, number: $0.number) }
    }

    public static func fetchBoard(_ token: String, projectId: String) async throws -> Board {
        struct R: Decodable {
            let node: Node?
            struct Node: Decodable {
                let title: String
                let field: Field?
                let views: Views?
                let items: Items
            }
            struct Field: Decodable { let id: String; let options: [Option] }
            struct Option: Decodable { let id: String; let name: String; let color: String? }
            struct Views: Decodable { let nodes: [ViewNode] }
            struct ViewNode: Decodable { let layout: String?; let sortByFields: SortConn }
            struct SortConn: Decodable { let nodes: [SortNode] }
            struct SortNode: Decodable { let direction: String; let field: SortField? }
            struct SortField: Decodable {
                let name: String?
                let dataType: String?
                let options: [Option]?
            }
            struct Items: Decodable { let nodes: [Item] }
            struct Item: Decodable {
                let id: String
                let content: Content?
                let fieldValueByName: StatusValue?
                let fieldValues: FieldValues?
            }
            struct Content: Decodable {
                let typename: String?
                let title: String?
                let number: Int?
                let url: String?
                enum CodingKeys: String, CodingKey {
                    case typename = "__typename", title, number, url
                }
            }
            struct StatusValue: Decodable { let optionId: String? }
            struct FieldValues: Decodable { let nodes: [FieldValueNode] }
            struct FieldValueNode: Decodable {
                let text: String?
                let number: Double?
                let date: String?
                let optionId: String?
                let startDate: String?
                let field: FieldNameOnly?
            }
            struct FieldNameOnly: Decodable { let name: String? }
        }
        let query = """
        query($id:ID!){ node(id:$id){ ... on ProjectV2 {
          title
          field(name:"Status"){ ... on ProjectV2SingleSelectField { id options { id name color } } }
          views(first:10){ nodes {
            layout
            sortByFields(first:10){ nodes {
              direction
              field {
                ... on ProjectV2FieldCommon { name dataType }
                ... on ProjectV2SingleSelectField { options { id name color } }
              }
            } }
          } }
          items(first:100){ nodes {
            id
            content { __typename
              ... on Issue { title number url }
              ... on PullRequest { title number url }
              ... on DraftIssue { title }
            }
            fieldValueByName(name:"Status"){ ... on ProjectV2ItemFieldSingleSelectValue { optionId } }
            fieldValues(first:30){ nodes {
              ... on ProjectV2ItemFieldTextValue { text field { ... on ProjectV2FieldCommon { name } } }
              ... on ProjectV2ItemFieldNumberValue { number field { ... on ProjectV2FieldCommon { name } } }
              ... on ProjectV2ItemFieldDateValue { date field { ... on ProjectV2FieldCommon { name } } }
              ... on ProjectV2ItemFieldSingleSelectValue { optionId field { ... on ProjectV2FieldCommon { name } } }
              ... on ProjectV2ItemFieldIterationValue { startDate field { ... on ProjectV2FieldCommon { name } } }
            } }
          } }
        } } }
        """
        let r = try await run(token, query: query, variables: ["id": projectId], as: R.self)
        guard let node = r.node else { throw APIError.graphql("Project not found") }

        let options = node.field?.options.map {
            StatusOption(id: $0.id, name: $0.name, color: $0.color)
        } ?? []

        // read the board view's sort configuration
        let views = node.views?.nodes ?? []
        let view = views.first(where: { $0.layout == "BOARD_LAYOUT" }) ?? views.first
        let sortBy: [SortSpec] = (view?.sortByFields.nodes ?? []).compactMap { s in
            guard let name = s.field?.name, let dt = s.field?.dataType else { return nil }
            return SortSpec(
                fieldName: name, direction: s.direction, dataType: dt,
                optionOrder: s.field?.options?.map { $0.id } ?? [])
        }

        // build cards + a per-item map of sortable field values
        var valuesByItem: [String: [String: SortVal]] = [:]
        let cards = node.items.nodes.map { item -> Card in
            var values: [String: SortVal] = [:]
            for v in item.fieldValues?.nodes ?? [] {
                guard let name = v.field?.name else { continue }
                if let t = v.text { values[name] = .str(t) }
                else if let n = v.number { values[name] = .num(n) }
                else if let d = v.date { values[name] = .str(d) }
                else if let o = v.optionId { values[name] = .str(o) }
                else if let s = v.startDate { values[name] = .str(s) }
            }
            valuesByItem[item.id] = values
            return Card(
                itemId: item.id,
                title: item.content?.title
                    ?? "🔒 内容を取得できません（リポジトリ読み取り権限が必要）",
                number: item.content?.number,
                url: item.content?.url,
                statusOptionId: item.fieldValueByName?.optionId,
                kind: CardKind(typename: item.content?.typename)
            )
        }

        let sorted = sortedCards(cards, by: sortBy, values: valuesByItem)

        return Board(
            title: node.title,
            statusFieldId: node.field?.id,
            statusOptions: options,
            cards: sorted
        )
    }

    public static func updateStatus(
        _ token: String, projectId: String, itemId: String, fieldId: String, optionId: String
    ) async throws {
        struct R: Decodable { let updateProjectV2ItemFieldValue: Payload?
            struct Payload: Decodable {} }
        let mutation = """
        mutation($project:ID!,$item:ID!,$field:ID!,$option:String!){
          updateProjectV2ItemFieldValue(input:{projectId:$project,itemId:$item,fieldId:$field,value:{singleSelectOptionId:$option}}){ projectV2Item { id } }
        }
        """
        _ = try await run(
            token, query: mutation,
            variables: ["project": projectId, "item": itemId, "field": fieldId, "option": optionId],
            as: R.self)
    }

    @discardableResult
    public static func addDraft(_ token: String, projectId: String, title: String) async throws -> String {
        struct R: Decodable {
            let addProjectV2DraftIssue: Payload?
            struct Payload: Decodable { let projectItem: Item; struct Item: Decodable { let id: String } }
        }
        let mutation = """
        mutation($project:ID!,$title:String!){ addProjectV2DraftIssue(input:{projectId:$project,title:$title}){ projectItem { id } } }
        """
        let r = try await run(
            token, query: mutation,
            variables: ["project": projectId, "title": title], as: R.self)
        guard let id = r.addProjectV2DraftIssue?.projectItem.id else { throw APIError.badResponse }
        return id
    }

    /// Create a draft task and, if a status column is given, move it there.
    public static func createTask(
        _ token: String, projectId: String, title: String,
        fieldId: String?, optionId: String?
    ) async throws {
        let itemId = try await addDraft(token, projectId: projectId, title: title)
        if let fieldId, let optionId {
            try await updateStatus(
                token, projectId: projectId, itemId: itemId, fieldId: fieldId, optionId: optionId)
        }
    }
}
