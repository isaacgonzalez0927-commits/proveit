import Foundation

/// Shared snapshot written by the Capacitor app and read by the home-screen widget.
struct ProveitWidgetSnapshot: Codable {
    var updatedAt: String
    var signedIn: Bool
    var maxStreak: Int
    var topGoalTitle: String
    var topGoalStreak: Int
    var goalsDoneToday: Int
    var goalsDueToday: Int
    var gardenWatered: Int
    var gardenTotal: Int
    var streakUnit: String

    static let placeholder = ProveitWidgetSnapshot(
        updatedAt: "",
        signedIn: false,
        maxStreak: 0,
        topGoalTitle: "Open Proveit",
        topGoalStreak: 0,
        goalsDoneToday: 0,
        goalsDueToday: 0,
        gardenWatered: 0,
        gardenTotal: 0,
        streakUnit: "week"
    )
}

enum ProveitWidgetStore {
    static let appGroupId = "group.com.proveit.app"
    static let snapshotKey = "proveit_widget_snapshot_v1"

    static var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: appGroupId)
    }

    static func saveSnapshot(_ snapshot: ProveitWidgetSnapshot) {
        guard let defaults = sharedDefaults else { return }
        if let data = try? JSONEncoder().encode(snapshot) {
            defaults.set(data, forKey: snapshotKey)
        }
    }

    static func loadSnapshot() -> ProveitWidgetSnapshot {
        guard
            let defaults = sharedDefaults,
            let data = defaults.data(forKey: snapshotKey),
            let snapshot = try? JSONDecoder().decode(ProveitWidgetSnapshot.self, from: data)
        else {
            return .placeholder
        }
        return snapshot
    }

    static func saveSnapshotJSON(_ json: String) {
        guard
            let data = json.data(using: .utf8),
            let snapshot = try? JSONDecoder().decode(ProveitWidgetSnapshot.self, from: data)
        else {
            return
        }
        saveSnapshot(snapshot)
    }
}
