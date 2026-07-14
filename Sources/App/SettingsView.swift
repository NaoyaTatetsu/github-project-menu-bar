import SwiftUI

struct SettingsView: View {
    @ObservedObject var vm: BoardViewModel
    @State private var token = ""
    @State private var checking = false
    @State private var message = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("GitHub Token").font(.headline)
            Text("Tokens (classic) に `project`（プライベートリポジトリのIssue/PR閲覧が必要なら `repo` も）を付与して貼り付けてください。")
                .font(.caption)
                .foregroundStyle(.secondary)

            SecureField("ghp_… / github_pat_…", text: $token)
                .textFieldStyle(.roundedBorder)

            if !message.isEmpty {
                Text(message).font(.caption).foregroundStyle(.red)
            }

            HStack {
                Button {
                    Task {
                        checking = true
                        let ok = await vm.saveToken(
                            token.trimmingCharacters(in: .whitespaces))
                        if !ok { message = vm.errorMessage ?? "無効なトークン" }
                        checking = false
                    }
                } label: {
                    Text(checking ? "確認中…" : "保存して接続")
                }
                .disabled(token.isEmpty || checking)

                if vm.token != nil {
                    Button("キャンセル") { vm.showSettings = false }
                }
                Spacer()
                Button("終了") { NSApplication.shared.terminate(nil) }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .onAppear { token = vm.token ?? "" }
    }
}
