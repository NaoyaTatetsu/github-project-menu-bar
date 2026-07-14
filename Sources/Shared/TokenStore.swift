import Foundation
import Security

/// Generic Keychain helper. Both the app and the widget carry the same
/// keychain-access-groups entitlement, so items written by one are readable by
/// the other (no App Group needed — works on a free Apple ID).
enum Keychain {
    static func get(_ account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: AppConfig.keychainService,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data,
              let value = String(data: data, encoding: .utf8)
        else { return nil }
        return value
    }

    static func set(_ value: String, account: String) {
        let data = Data(value.utf8)
        let base: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: AppConfig.keychainService,
            kSecAttrAccount as String: account,
        ]
        let status = SecItemUpdate(
            base as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        if status == errSecItemNotFound {
            var add = base
            add[kSecValueData as String] = data
            SecItemAdd(add as CFDictionary, nil)
        }
    }

    static func clear(_ account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: AppConfig.keychainService,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }
}

/// GitHub token, stored in the shared Keychain.
public enum TokenStore {
    public static func get() -> String? { Keychain.get(AppConfig.tokenAccount) }
    public static func set(_ token: String) { Keychain.set(token, account: AppConfig.tokenAccount) }
    public static func clear() { Keychain.clear(AppConfig.tokenAccount) }
}

/// Non-sensitive shared settings (selected project), also via the Keychain so
/// the widget can read what the app selected without an App Group.
public enum SharedStore {
    public static var selectedProjectId: String? {
        get { Keychain.get(AppConfig.projectAccount) }
        set {
            if let newValue { Keychain.set(newValue, account: AppConfig.projectAccount) }
            else { Keychain.clear(AppConfig.projectAccount) }
        }
    }

    /// Which status column the widget is currently showing.
    public static var widgetSelectedStatus: String? {
        get { Keychain.get(AppConfig.widgetStatusAccount) }
        set {
            if let newValue { Keychain.set(newValue, account: AppConfig.widgetStatusAccount) }
            else { Keychain.clear(AppConfig.widgetStatusAccount) }
        }
    }
}

/// Last-fetched board, cached so the widget can re-render instantly (e.g. when
/// switching status) without hitting the network every time.
public enum BoardCache {
    private struct Entry: Codable {
        let board: Board
        let fetchedAt: Double
    }

    public static func save(_ board: Board) {
        let entry = Entry(board: board, fetchedAt: Date().timeIntervalSince1970)
        if let data = try? JSONEncoder().encode(entry),
           let json = String(data: data, encoding: .utf8) {
            Keychain.set(json, account: AppConfig.boardCacheAccount)
        }
    }

    /// Returns the cached board and how old it is (seconds), if present.
    public static func load() -> (board: Board, age: TimeInterval)? {
        guard let json = Keychain.get(AppConfig.boardCacheAccount),
              let data = json.data(using: .utf8),
              let entry = try? JSONDecoder().decode(Entry.self, from: data)
        else { return nil }
        return (entry.board, Date().timeIntervalSince1970 - entry.fetchedAt)
    }
}
