import AppIntents
import Foundation
import UIKit

private enum HabitTrackerIntentURL {
  static func make(command: String, habit: String? = nil, amount: Double? = nil) throws -> URL {
    var components = URLComponents()
    components.scheme = "habit-tracker"
    components.host = "intent"
    var items = [URLQueryItem(name: "command", value: command)]
    if let habit { items.append(URLQueryItem(name: "habit", value: habit)) }
    if let amount { items.append(URLQueryItem(name: "amount", value: String(amount))) }
    components.queryItems = items
    guard let url = components.url else { throw HabitTrackerIntentError.invalidRequest }
    return url
  }
}

private enum HabitTrackerIntentError: Error, CustomLocalizedStringResourceConvertible {
  case invalidRequest
  var localizedStringResource: LocalizedStringResource { "The Habit Tracker request was invalid." }
}

struct CompleteHabitIntent: AppIntent {
  static let title: LocalizedStringResource = "Complete Habit"
  static let description = IntentDescription("Completes a habit for today in Habit Tracker.")
  static let openAppWhenRun = true
  @Parameter(title: "Habit", requestValueDialog: "Which habit would you like to complete?") var habit: String
  @MainActor func perform() async throws -> some IntentResult {
    await UIApplication.shared.open(try HabitTrackerIntentURL.make(command: "complete", habit: habit))
    return .result()
  }
}

struct AddHabitProgressIntent: AppIntent {
  static let title: LocalizedStringResource = "Add Habit Progress"
  static let description = IntentDescription("Adds progress to a count, quantity, or duration habit.")
  static let openAppWhenRun = true
  @Parameter(title: "Habit", requestValueDialog: "Which habit?") var habit: String
  @Parameter(title: "Amount", requestValueDialog: "How much progress?") var amount: Double
  @MainActor func perform() async throws -> some IntentResult {
    await UIApplication.shared.open(try HabitTrackerIntentURL.make(command: "add-progress", habit: habit, amount: amount))
    return .result()
  }
}

struct StartHabitTimerIntent: AppIntent {
  static let title: LocalizedStringResource = "Start Habit Timer"
  static let description = IntentDescription("Starts a timer for a duration habit.")
  static let openAppWhenRun = true
  @Parameter(title: "Habit", requestValueDialog: "Which duration habit?") var habit: String
  @MainActor func perform() async throws -> some IntentResult {
    await UIApplication.shared.open(try HabitTrackerIntentURL.make(command: "start-timer", habit: habit))
    return .result()
  }
}

struct ShowTodayIntent: AppIntent {
  static let title: LocalizedStringResource = "Show Today"
  static let description = IntentDescription("Opens today's habits in Habit Tracker.")
  static let openAppWhenRun = true
  @MainActor func perform() async throws -> some IntentResult {
    return .result()
  }
}

struct HabitTrackerShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(intent: CompleteHabitIntent(), phrases: ["Complete a habit in \(.applicationName)", "Check off a habit in \(.applicationName)"], shortTitle: "Complete Habit", systemImageName: "checkmark.circle")
    AppShortcut(intent: AddHabitProgressIntent(), phrases: ["Add habit progress in \(.applicationName)"], shortTitle: "Add Progress", systemImageName: "plus.circle")
    AppShortcut(intent: StartHabitTimerIntent(), phrases: ["Start a habit timer in \(.applicationName)"], shortTitle: "Start Timer", systemImageName: "timer")
    AppShortcut(intent: ShowTodayIntent(), phrases: ["Show today in \(.applicationName)", "Show my habits in \(.applicationName)"], shortTitle: "Show Today", systemImageName: "calendar")
  }
}
