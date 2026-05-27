import SwiftUI
import WidgetKit

private let proveitGreen = Color(red: 0.06, green: 0.72, blue: 0.51)
private let proveitNavy = Color(red: 0.04, green: 0.09, blue: 0.16)

struct ProveitWidgetBackground: ViewModifier {
    func body(content: Content) -> some View {
        content
            .containerBackground(for: .widget) {
                LinearGradient(
                    colors: [proveitNavy, Color(red: 0.03, green: 0.14, blue: 0.12)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            }
    }
}

extension View {
    func proveitWidgetBackground() -> some View {
        modifier(ProveitWidgetBackground())
    }
}

struct ProveitStreakWidgetView: View {
    let entry: ProveitEntry

    var body: some View {
        Link(destination: URL(string: "proveit://dashboard")!) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Proveit")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.8))
                    Spacer()
                    Image(systemName: "leaf.fill")
                        .foregroundStyle(proveitGreen)
                }
                Spacer()
                if entry.snapshot.signedIn {
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Image(systemName: "flame.fill")
                            .foregroundStyle(.orange)
                            .font(.title3)
                        Text("\(entry.snapshot.maxStreak)")
                            .font(.system(size: 42, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                    }
                    Text("\(entry.snapshot.streakUnit) streak")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.white.opacity(0.75))
                    if !entry.snapshot.topGoalTitle.isEmpty {
                        Text(entry.snapshot.topGoalTitle)
                            .font(.caption2)
                            .foregroundStyle(proveitGreen.opacity(0.95))
                            .lineLimit(1)
                    }
                } else {
                    Text("Sign in")
                        .font(.title3.weight(.bold))
                        .foregroundStyle(.white)
                    Text("Open Proveit to sync")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.7))
                }
            }
            .padding(14)
        }
        .proveitWidgetBackground()
    }
}

struct ProveitProgressWidgetView: View {
    let entry: ProveitEntry

    private var progress: Double {
        guard entry.snapshot.goalsDueToday > 0 else { return entry.snapshot.goalsDoneToday > 0 ? 1 : 0 }
        return Double(entry.snapshot.goalsDoneToday) / Double(entry.snapshot.goalsDueToday)
    }

    var body: some View {
        Link(destination: URL(string: "proveit://dashboard")!) {
            HStack(spacing: 14) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Today")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.75))
                    Text("\(entry.snapshot.goalsDoneToday)/\(max(entry.snapshot.goalsDueToday, 1))")
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                    Text("goals proved")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.7))
                }
                Spacer()
                VStack(spacing: 10) {
                    ZStack {
                        Circle()
                            .stroke(.white.opacity(0.15), lineWidth: 8)
                        Circle()
                            .trim(from: 0, to: progress)
                            .stroke(proveitGreen, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                        Image(systemName: progress >= 1 ? "checkmark" : "camera.fill")
                            .foregroundStyle(.white)
                            .font(.headline)
                    }
                    .frame(width: 72, height: 72)
                    HStack(spacing: 4) {
                        Image(systemName: "flame.fill")
                            .foregroundStyle(.orange)
                            .font(.caption2)
                        Text("\(entry.snapshot.maxStreak) \(entry.snapshot.streakUnit)")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.white.opacity(0.85))
                    }
                }
            }
            .padding(16)
        }
        .proveitWidgetBackground()
    }
}

struct ProveitGardenWidgetView: View {
    let entry: ProveitEntry

    private var wateredProgress: Double {
        guard entry.snapshot.gardenTotal > 0 else { return 0 }
        return Double(entry.snapshot.gardenWatered) / Double(entry.snapshot.gardenTotal)
    }

    var body: some View {
        Link(destination: URL(string: "proveit://buddy")!) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Goal garden")
                            .font(.headline.weight(.bold))
                            .foregroundStyle(.white)
                        Text("Tap to water your plants")
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.65))
                    }
                    Spacer()
                    Image(systemName: "leaf.fill")
                        .font(.title2)
                        .foregroundStyle(proveitGreen)
                }

                HStack(spacing: 16) {
                    gardenStat(title: "Watered", value: "\(entry.snapshot.gardenWatered)")
                    gardenStat(title: "Active", value: "\(entry.snapshot.gardenTotal)")
                    gardenStat(title: "Top streak", value: "\(entry.snapshot.topGoalStreak)")
                }

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(entry.snapshot.topGoalTitle)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                        Spacer()
                        Text("\(Int(wateredProgress * 100))%")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(proveitGreen)
                    }
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(.white.opacity(0.12))
                            Capsule()
                                .fill(proveitGreen)
                                .frame(width: geo.size.width * wateredProgress)
                        }
                    }
                    .frame(height: 8)
                }

                HStack {
                    Image(systemName: "flame.fill")
                        .foregroundStyle(.orange)
                    Text("Best streak: \(entry.snapshot.maxStreak) \(entry.snapshot.streakUnit)s")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.white.opacity(0.8))
                }
            }
            .padding(16)
        }
        .proveitWidgetBackground()
    }

    @ViewBuilder
    private func gardenStat(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.55))
            Text(value)
                .font(.title3.weight(.bold))
                .foregroundStyle(.white)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(.white.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
