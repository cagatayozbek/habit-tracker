import type { Database } from "../../db/connection";
import type { SyncStamp } from "./sync.types";
export function syncRepository(db: Database) {
  return {
    async get(): Promise<(SyncStamp & { enabled: boolean; lastError: string | null }) | null> {
      const row = await db.getFirstAsync<{ revision: number; updated_at: string; device_id: string; deleted: number; enabled: number; last_error: string | null }>("SELECT * FROM sync_state WHERE singleton_id = 1");
      return row ? { revision: row.revision, updatedAt: row.updated_at, deviceId: row.device_id, deleted: row.deleted === 1, enabled: row.enabled === 1, lastError: row.last_error } : null;
    },
    async setEnabled(enabled: boolean, deviceId: string, now: string) {
      await db.runAsync("INSERT INTO sync_state (singleton_id, enabled, revision, updated_at, device_id, deleted, last_error) VALUES (1, ?, 0, ?, ?, 0, NULL) ON CONFLICT(singleton_id) DO UPDATE SET enabled=excluded.enabled, updated_at=excluded.updated_at, device_id=excluded.device_id, last_error=NULL", Number(enabled), now, deviceId);
    },
    async markChanged(deviceId: string, now: string, deleted = false) {
      await db.runAsync("UPDATE sync_state SET revision = revision + 1, updated_at = ?, device_id = ?, deleted = ?, last_error = NULL WHERE singleton_id = 1", now, deviceId, Number(deleted));
    },
    async setError(message: string | null) { await db.runAsync("UPDATE sync_state SET last_error = ? WHERE singleton_id = 1", message); },
  };
}
