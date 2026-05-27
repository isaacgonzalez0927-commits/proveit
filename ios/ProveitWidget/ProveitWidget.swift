import WidgetKit
import SwiftUI

struct ProveitEntry: TimelineEntry {
    let date: Date
    let snapshot: ProveitWidgetSnapshot
}

struct ProveitTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> ProveitEntry {
        ProveitEntry(date: Date(), snapshot: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (ProveitEntry) -> Void) {
        completion(ProveitEntry(date: Date(), snapshot: ProveitWidgetStore.loadSnapshot()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ProveitEntry>) -> Void) {
        let snapshot = ProveitWidgetStore.loadSnapshot()
        let entry = ProveitEntry(date: Date(), snapshot: snapshot)
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }
}

@main
struct ProveitWidgetBundle: WidgetBundle {
    var body: some Widget {
        ProveitStreakWidget()
        ProveitProgressWidget()
        ProveitGardenWidget()
    }
}

struct ProveitStreakWidget: Widget {
    let kind = "ProveitStreakWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ProveitTimelineProvider()) { entry in
            ProveitStreakWidgetView(entry: entry)
        }
        .configurationDisplayName("Streak")
        .description("Your best goal streak at a glance.")
        .supportedFamilies([.systemSmall])
    }
}

struct ProveitProgressWidget: Widget {
    let kind = "ProveitProgressWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ProveitTimelineProvider()) { entry in
            ProveitProgressWidgetView(entry: entry)
        }
        .configurationDisplayName("Today's goals")
        .description("See how many goals you've proved today.")
        .supportedFamilies([.systemMedium])
    }
}

struct ProveitGardenWidget: Widget {
    let kind = "ProveitGardenWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ProveitTimelineProvider()) { entry in
            ProveitGardenWidgetView(entry: entry)
        }
        .configurationDisplayName("Goal garden")
        .description("Garden progress and your top streak.")
        .supportedFamilies([.systemLarge])
    }
}
