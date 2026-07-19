import SwiftUI

struct BoardView: View {
    @ObservedObject var vm: BoardViewModel
    let board: Board

    var body: some View {
        ScrollView(.horizontal, showsIndicators: true) {
            HStack(alignment: .top, spacing: 8) {
                ForEach(board.statusOptions) { opt in
                    ColumnView(
                        vm: vm, title: opt.name, optionId: opt.id,
                        cards: board.cards(in: opt.id))
                }
                let noStatus = board.cards(in: nil)
                if !noStatus.isEmpty {
                    ColumnView(vm: vm, title: "No Status", optionId: nil, cards: noStatus)
                }
            }
            .padding(8)
        }
    }
}

private struct ColumnView: View {
    @ObservedObject var vm: BoardViewModel
    let title: String
    let optionId: String?
    let cards: [Card]

    @State private var adding = false
    @State private var newTitle = ""
    @State private var targeted = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(title.uppercased())
                    .font(.caption2).bold()
                    .foregroundStyle(.secondary)
                Spacer()
                Text("\(cards.count)")
                    .font(.caption2).foregroundStyle(.secondary)
                Button { adding = true; newTitle = "" } label: {
                    Image(systemName: "plus")
                }
                .buttonStyle(.plain)
            }

            ScrollView {
                VStack(spacing: 6) {
                    ForEach(cards) { card in
                        CardView(vm: vm, card: card, board: vm.board)
                    }
                    if adding {
                        TextField("タスク名", text: $newTitle)
                            .textFieldStyle(.roundedBorder)
                            .font(.caption)
                            .onSubmit { commit() }
                            .onExitCommand { adding = false; newTitle = "" }
                    }
                }
            }
        }
        .frame(width: 180)
        .frame(maxHeight: .infinity, alignment: .top)
        .padding(8)
        .background(.quaternary.opacity(0.35), in: RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .strokeBorder(Color.accentColor, lineWidth: targeted ? 2 : 0)
        )
        .dropDestination(for: String.self) { ids, _ in
            guard let optionId else { return false }  // can't set "No Status" via API
            var moved = false
            for id in ids {
                if let card = vm.board?.cards.first(where: { $0.itemId == id }),
                   card.statusOptionId != optionId {
                    vm.move(card: card, to: optionId)
                    moved = true
                }
            }
            return moved
        } isTargeted: { targeted = $0 }
    }

    private func commit() {
        let t = newTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        if !t.isEmpty { vm.addTask(title: t, optionId: optionId) }
        newTitle = ""
        adding = false
    }
}

private struct CardView: View {
    @ObservedObject var vm: BoardViewModel
    let card: Card
    let board: Board?

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(alignment: .top, spacing: 6) {
                Circle()
                    .fill(statusColor(colorEnum))
                    .frame(width: 8, height: 8)
                    .padding(.top, 3)
                Text(card.title)
                    .font(.caption)
                    .lineLimit(3)
                Spacer(minLength: 0)
            }

            if !card.labels.isEmpty {
                FlowLayout(spacing: 4) {
                    ForEach(card.labels, id: \.name) { LabelChipView(label: $0) }
                }
            }

            if card.priority != nil || card.endDate != nil {
                HStack(spacing: 6) {
                    if let priority = card.priority {
                        PriorityChipView(name: priority, colorEnum: card.priorityColor)
                    }
                    Spacer(minLength: 0)
                    if let end = card.endDate {
                        HStack(spacing: 3) {
                            Image(systemName: "calendar").font(.system(size: 9))
                            Text(formatProjectDate(end)).font(.system(size: 10))
                        }
                        .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .padding(8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.background.opacity(0.6), in: RoundedRectangle(cornerRadius: 8))
        .contentShape(Rectangle())
        .draggable(card.itemId)
        .contextMenu {
            if let board {
                ForEach(board.statusOptions) { opt in
                    Button(opt.name) { vm.move(card: card, to: opt.id) }
                }
            }
            if let url = card.url, let u = URL(string: url) {
                Divider()
                Button("GitHub で開く") { NSWorkspace.shared.open(u) }
            }
        }
        .onTapGesture {
            if let url = card.url, let u = URL(string: url) { NSWorkspace.shared.open(u) }
        }
    }

    private var colorEnum: String? {
        board?.statusOptions.first(where: { $0.id == card.statusOptionId })?.color
    }
}

// MARK: - Card metadata chips

private struct LabelChipView: View {
    let label: CardLabel

    var body: some View {
        let color = Color(hex: label.color) ?? .secondary
        Text(label.name)
            .font(.system(size: 9))
            .lineLimit(1)
            .padding(.horizontal, 5)
            .padding(.vertical, 1)
            .background(color.opacity(0.22), in: Capsule())
            .overlay(Capsule().strokeBorder(color.opacity(0.5), lineWidth: 0.5))
            .foregroundStyle(color)
    }
}

private struct PriorityChipView: View {
    let name: String
    let colorEnum: String?

    var body: some View {
        let color = statusColor(colorEnum)
        Text(name)
            .font(.system(size: 9)).bold()
            .lineLimit(1)
            .padding(.horizontal, 5)
            .padding(.vertical, 1)
            .background(color.opacity(0.22), in: Capsule())
            .foregroundStyle(color)
    }
}

private extension Color {
    /// Build a Color from a GitHub hex string like "d73a4a" (with or without "#").
    init?(hex: String?) {
        guard var s = hex else { return nil }
        s = s.trimmingCharacters(in: .whitespaces)
        if s.hasPrefix("#") { s.removeFirst() }
        guard s.count == 6, let v = UInt64(s, radix: 16) else { return nil }
        self.init(
            red: Double((v >> 16) & 0xFF) / 255,
            green: Double((v >> 8) & 0xFF) / 255,
            blue: Double(v & 0xFF) / 255)
    }
}

// MARK: - Wrapping layout for labels

/// Left-to-right flow layout that wraps subviews to the next line when they
/// exceed the available width (used for the card's label chips).
private struct FlowLayout: Layout {
    var spacing: CGFloat = 4

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0, maxRowWidth: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                maxRowWidth = max(maxRowWidth, x - spacing)
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        maxRowWidth = max(maxRowWidth, x - spacing)
        return CGSize(width: min(maxRowWidth, maxWidth), height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > bounds.width, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            subview.place(
                at: CGPoint(x: bounds.minX + x, y: bounds.minY + y),
                anchor: .topLeading, proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
