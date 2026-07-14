import SwiftUI
import WidgetKit

@MainActor
final class BoardViewModel: ObservableObject {
    @Published var token: String?
    @Published var projects: [Project] = []
    @Published var selectedProjectId: String?
    @Published var board: Board?
    @Published var loading = false
    @Published var errorMessage: String?
    @Published var showSettings = false

    init() {
        token = TokenStore.get()
        selectedProjectId = SharedStore.selectedProjectId
        showSettings = (token == nil)
    }

    func load() async {
        guard let token else { showSettings = true; return }
        loading = true
        errorMessage = nil
        do {
            projects = try await GitHubAPI.listProjects(token)
            if selectedProjectId == nil
                || !projects.contains(where: { $0.id == selectedProjectId }) {
                selectedProjectId = projects.first?.id
                SharedStore.selectedProjectId = selectedProjectId
            }
            await loadBoard()
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }

    func loadBoard() async {
        guard let token, let pid = selectedProjectId else { return }
        loading = true
        errorMessage = nil
        do {
            board = try await GitHubAPI.fetchBoard(token, projectId: pid)
            if let b = board { BoardCache.save(b) }  // keep the widget in sync
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }

    func select(_ id: String) {
        selectedProjectId = id
        SharedStore.selectedProjectId = id
        Task { await loadBoard() }
    }

    func saveToken(_ value: String) async -> Bool {
        errorMessage = nil
        do {
            _ = try await GitHubAPI.verifyLogin(value)
            TokenStore.set(value)
            token = value
            showSettings = false
            await load()
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func move(card: Card, to optionId: String) {
        guard let token, let pid = selectedProjectId,
              let field = board?.statusFieldId else { return }
        if let idx = board?.cards.firstIndex(where: { $0.itemId == card.itemId }) {
            board?.cards[idx].statusOptionId = optionId  // optimistic
        }
        Task {
            do {
                try await GitHubAPI.updateStatus(
                    token, projectId: pid, itemId: card.itemId, fieldId: field, optionId: optionId)
            } catch {
                errorMessage = error.localizedDescription
                await loadBoard()
            }
            if let b = board { BoardCache.save(b) }  // reflect the move in the widget cache
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    func addTask(title: String, optionId: String?) {
        guard let token, let pid = selectedProjectId else { return }
        Task {
            do {
                try await GitHubAPI.createTask(
                    token, projectId: pid, title: title,
                    fieldId: board?.statusFieldId, optionId: optionId)
                await loadBoard()
                WidgetCenter.shared.reloadAllTimelines()
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}
