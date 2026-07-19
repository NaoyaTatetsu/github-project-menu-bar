import SwiftUI
import WidgetKit

struct BoardWidgetView: View {
    let entry: BoardEntry

    var body: some View {
        if let board = entry.board {
            VStack(alignment: .leading, spacing: 6) {
                Text(board.title)
                    .font(.caption).bold()
                    .lineLimit(1)

                statusButtons(board)
                Divider()
                taskList(board)

                Spacer(minLength: 0)
            }
        } else if let error = entry.error {
            Text(error).font(.caption2).foregroundStyle(.secondary)
        } else {
            Text("読み込み中…").font(.caption2).foregroundStyle(.secondary)
        }
    }

    // MARK: - status buttons (top, left→right)

    private func statusButtons(_ board: Board) -> some View {
        HStack(spacing: 5) {
            ForEach(board.statusOptions) { opt in
                let selected = opt.id == entry.selectedOptionId
                Button(intent: SelectStatusIntent(optionId: opt.id)) {
                    HStack(spacing: 3) {
                        Circle().fill(statusColor(opt.color)).frame(width: 6, height: 6)
                        Text(opt.name).font(.caption2).lineLimit(1)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(
                        selected ? Color.accentColor.opacity(0.28) : Color.secondary.opacity(0.12),
                        in: Capsule()
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - tasks of the selected status

    private func taskList(_ board: Board) -> some View {
        let cards = board.cards(in: entry.selectedOptionId)
        return VStack(alignment: .leading, spacing: 3) {
            if cards.isEmpty {
                Text("タスクなし").font(.caption2).foregroundStyle(.secondary)
            } else {
                ForEach(cards.prefix(10)) { card in
                    HStack(spacing: 4) {
                        Text("• \(card.title)")
                            .font(.system(size: 13))
                            .lineLimit(1)
                        Spacer(minLength: 4)
                        if let priority = card.priority {
                            Text(priority)
                                .font(.system(size: 10)).bold()
                                .foregroundStyle(statusColor(card.priorityColor))
                        }
                        if let end = card.endDate {
                            Text(formatProjectDate(end))
                                .font(.system(size: 10))
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                if cards.count > 10 {
                    Text("他 \(cards.count - 10) 件")
                        .font(.caption2).foregroundStyle(.secondary)
                }
            }
        }
    }
}
