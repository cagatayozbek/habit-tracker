import Foundation
import React
import WatchConnectivity

@objc(HabitTrackerWatchConnectivity)
final class HabitTrackerWatchConnectivity: RCTEventEmitter {
  private static let coordinator = WatchCoordinator()

  override static func requiresMainQueueSetup() -> Bool { true }
  override func supportedEvents() -> [String]! { ["HabitTrackerWatchAction"] }

  override func startObserving() {
    Self.coordinator.onAction = { [weak self] action in
      self?.sendEvent(withName: "HabitTrackerWatchAction", body: action)
    }
    Self.coordinator.flush()
  }

  override func stopObserving() { Self.coordinator.onAction = nil }

  @objc(publishSnapshot:resolve:rejecter:)
  func publishSnapshot(_ snapshot: NSDictionary, resolve: RCTPromiseResolveBlock, rejecter: RCTPromiseRejectBlock) {
    do { try Self.coordinator.publish(snapshot as? [String: Any] ?? [:]); resolve(nil) }
    catch { rejecter("watch_publish_failed", error.localizedDescription, error) }
  }

  @objc(consumePendingActions:rejecter:)
  func consumePendingActions(_ resolve: RCTPromiseResolveBlock, rejecter: RCTPromiseRejectBlock) {
    resolve(Self.coordinator.drain())
  }
}

private final class WatchCoordinator: NSObject, WCSessionDelegate {
  var onAction: (([String: Any]) -> Void)?
  private var pending = [[String: Any]]()

  override init() {
    super.init()
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    session.delegate = self
    session.activate()
  }

  func publish(_ snapshot: [String: Any]) throws {
    guard WCSession.isSupported(), WCSession.default.activationState == .activated else { return }
    let context: [String: Any] = ["snapshot": snapshot]
    try WCSession.default.updateApplicationContext(context)
  }

  func drain() -> [[String: Any]] {
    let actions = pending
    pending.removeAll()
    return actions
  }

  func flush() {
    guard let onAction else { return }
    let actions = drain()
    actions.forEach(onAction)
  }

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}
  func sessionDidBecomeInactive(_ session: WCSession) {}
  func sessionDidDeactivate(_ session: WCSession) { session.activate() }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    receive(message)
    replyHandler(["accepted": true])
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) { receive(userInfo) }

  private func receive(_ message: [String: Any]) {
    guard let command = message["command"] as? String,
          let habitId = message["habitId"] as? String,
          ["complete", "increment", "timer-start", "timer-pause"].contains(command) else { return }
    var action = message
    action["command"] = command
    action["habitId"] = habitId
    DispatchQueue.main.async { [weak self] in
      if let handler = self?.onAction { handler(action) }
      else { self?.pending.append(action) }
    }
  }
}
