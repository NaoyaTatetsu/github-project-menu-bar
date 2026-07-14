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
