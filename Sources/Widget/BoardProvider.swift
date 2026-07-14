import WidgetKit

struct BoardEntry: TimelineEntry {
    let date: Date
    let board: Board?
    /// status option id currently selected by the widget's buttons
    let selectedOptionId: String?
    let error: String?
}

struct BoardProvider: TimelineProvider {
    func placeholder(in context: Context) -> BoardEntry {
        BoardEntry(date: Date(), board: nil, selectedOptionId: nil, error: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (BoardEntry) -> Void) {
        Task { completion(await fetch()) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BoardEntry>) -> Void) {
        Task {
            let entry = await fetch()
            // refresh the cache from the network on this cadence
            let next = Date().addingTimeInterval(cacheTTL)
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }

    /// Use the cache while it's fresh (instant status switching); only hit the
    /// network when it's stale or missing.
    private let cacheTTL: TimeInterval = 15 * 60

    private func fetch() async -> BoardEntry {
        // fresh cache → render instantly, no network
        if let cached = BoardCache.load(), cached.age < cacheTTL {
            return entry(from: cached.board)
        }

        guard let token = TokenStore.get(), let pid = SharedStore.selectedProjectId else {
            if let cached = BoardCache.load() { return entry(from: cached.board) }
            return BoardEntry(
                date: Date(), board: nil, selectedOptionId: nil,
                error: "アプリでトークンとプロジェクトを設定してください")
        }
        do {
            let board = try await GitHubAPI.fetchBoard(token, projectId: pid)
            BoardCache.save(board)
            return entry(from: board)
        } catch {
            if let cached = BoardCache.load() { return entry(from: cached.board) }
            return BoardEntry(
                date: Date(), board: nil, selectedOptionId: nil,
                error: error.localizedDescription)
        }
    }

    private func entry(from board: Board) -> BoardEntry {
        let stored = SharedStore.widgetSelectedStatus
        let selected =
            board.statusOptions.contains(where: { $0.id == stored })
            ? stored : board.statusOptions.first?.id
        return BoardEntry(date: Date(), board: board, selectedOptionId: selected, error: nil)
    }
}
