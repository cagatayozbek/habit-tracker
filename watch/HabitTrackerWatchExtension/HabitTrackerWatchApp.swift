import SwiftUI
import WatchConnectivity

@main
struct HabitTrackerWatchApp: App {
  @StateObject private var store = WatchStore()
  var body: some Scene { WindowGroup { TodayView().environmentObject(store) } }
}

private struct WatchSnapshot: Codable {
  struct Habit: Codable, Identifiable {
    let id: String
    let name: String
    let type: String
    let value: Double
    let target: Double
    let unit: String?
    let completed: Bool
  }
  let date: String
  let completed: Int
  let total: Int
  let habits: [Habit]
  let activeTimerHabitId: String?
}

private final class WatchStore: NSObject, ObservableObject, WCSessionDelegate {
  @Published var snapshot: WatchSnapshot?
  @Published var syncState = "Waiting for iPhone"

  override init() {
    super.init()
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    session.delegate = self
    session.activate()
    apply(session.receivedApplicationContext)
  }

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    DispatchQueue.main.async { self.syncState = error == nil ? "Synced when iPhone is available" : "Waiting for iPhone" }
    apply(session.receivedApplicationContext)
  }
  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) { apply(applicationContext) }

  func send(command: String, habitId: String) {
    let action: [String: Any] = ["id": UUID().uuidString, "command": command, "habitId": habitId]
    let session = WCSession.default
    if session.activationState != .activated { syncState = "Waiting for iPhone"; return }
    if session.isReachable {
      session.sendMessage(action, replyHandler: { _ in }, errorHandler: { [weak self] _ in self?.queue(action) })
    } else { queue(action) }
  }

  private func queue(_ action: [String: Any]) {
    WCSession.default.transferUserInfo(action)
    DispatchQueue.main.async { self.syncState = "Action queued for iPhone" }
  }

  private func apply(_ context: [String: Any]) {
    guard JSONSerialization.isValidJSONObject(context),
      let object = context["snapshot"],
      JSONSerialization.isValidJSONObject(object),
      let data = try? JSONSerialization.data(withJSONObject: object),
      let decoded = try? JSONDecoder().decode(WatchSnapshot.self, from: data) else { return }
    DispatchQueue.main.async { self.snapshot = decoded; self.syncState = "Updated" }
  }
}

private struct TodayView: View {
  @EnvironmentObject var store: WatchStore
  var body: some View {
    Group {
      if let snapshot = store.snapshot {
        List {
          Section("Today \(snapshot.completed)/\(snapshot.total)") {
            ForEach(snapshot.habits) { habit in HabitRow(habit: habit) }
          }
          Text(store.syncState).font(.footnote).foregroundStyle(.secondary)
        }
      } else {
        VStack(spacing: 8) { ProgressView(); Text("Waiting for Today") ; Text(store.syncState).font(.footnote).foregroundStyle(.secondary) }
      }
    }
  }

  @ViewBuilder private func HabitRow(habit: WatchSnapshot.Habit) -> some View {
    HStack {
      VStack(alignment: .leading) {
        Text(habit.name).lineLimit(1)
        if habit.type != "check" { Text("\(habit.value, specifier: "%.0f") / \(habit.target, specifier: "%.0f")\(habit.unit.map { " \($0)" } ?? "")").font(.caption).foregroundStyle(.secondary) }
      }
      Spacer()
      if habit.type == "check" {
        Button { store.send(command: "complete", habitId: habit.id) } label: { Image(systemName: habit.completed ? "checkmark.circle.fill" : "circle") }.tint(habit.completed ? .green : .accentColor)
      } else if habit.type == "count" {
        Button { store.send(command: "increment", habitId: habit.id) } label: { Image(systemName: "plus.circle") }.disabled(habit.completed)
      } else if habit.type == "duration" {
        Button { store.send(command: habit.id == store.snapshot?.activeTimerHabitId ? "timer-pause" : "timer-start", habitId: habit.id) } label: { Image(systemName: habit.id == store.snapshot?.activeTimerHabitId ? "pause.circle" : "play.circle") }
      } else {
        Image(systemName: habit.completed ? "checkmark.circle.fill" : "circle").foregroundStyle(habit.completed ? .green : .secondary)
      }
    }
  }
}
