import SwiftUI

struct MenuContentView: View {
    @StateObject private var vm = BoardViewModel()

    var body: some View {
        Group {
            if vm.showSettings {
                SettingsView(vm: vm)
            } else {
                VStack(spacing: 0) {
                    header
                    if let msg = vm.errorMessage {
                        Text(msg)
                            .font(.caption2)
                            .foregroundStyle(.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(.red.opacity(0.1))
                    }
                    if let board = vm.board {
                        BoardView(vm: vm, board: board)
                    } else if vm.loading {
                        ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else {
                        Text("オープンなプロジェクトがありません")
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                }
            }
        }
        .task { await vm.load() }
    }

    private var header: some View {
        HStack(spacing: 8) {
            Picker("", selection: Binding(
                get: { vm.selectedProjectId ?? "" },
                set: { vm.select($0) }
            )) {
                ForEach(vm.projects) { p in Text(p.title).tag(p.id) }
            }
            .labelsHidden()
            .frame(maxWidth: .infinity)

            Button { Task { await vm.loadBoard() } } label: {
                Image(systemName: "arrow.clockwise")
                    .rotationEffect(.degrees(vm.loading ? 360 : 0))
                    .animation(vm.loading
                        ? .linear(duration: 0.8).repeatForever(autoreverses: false)
                        : .default, value: vm.loading)
            }
            .buttonStyle(.plain)
            .disabled(vm.loading)

            Button { vm.showSettings = true } label: { Image(systemName: "gearshape") }
                .buttonStyle(.plain)

            Button { NSApplication.shared.terminate(nil) } label: {
                Image(systemName: "power")
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .overlay(alignment: .bottom) { Divider() }
    }
}
