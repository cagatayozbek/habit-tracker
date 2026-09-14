export type SyncStamp = { revision: number; updatedAt: string; deviceId: string; deleted: boolean };
/** Deterministic, last-write-wins ordering; device ID breaks equal-clock ties. */
export function compareSyncStamps(left: SyncStamp, right: SyncStamp): number {
  if (left.revision !== right.revision) return left.revision - right.revision;
  const time = Date.parse(left.updatedAt) - Date.parse(right.updatedAt);
  if (time !== 0) return time;
  return left.deviceId.localeCompare(right.deviceId);
}
export function winner(left: SyncStamp, right: SyncStamp): "local" | "remote" {
  return compareSyncStamps(left, right) >= 0 ? "local" : "remote";
}
