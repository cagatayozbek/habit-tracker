import type { Database } from "../../db/connection.ts";
import { progressStateForValue } from "../../lib/goals.ts";
import type { HealthMapping, HealthMetric } from "./health.types.ts";

type MappingRow = { habit_id: string; metric: HealthMetric; last_synced_at: string | null };
export function healthRepository(db: Database) {
  return {
    async listMappings(): Promise<HealthMapping[]> {
      const rows = await db.getAllAsync<MappingRow>("SELECT habit_id, metric, last_synced_at FROM habit_health_mappings ORDER BY habit_id");
      return rows.map((row) => ({ habitId: row.habit_id, metric: row.metric, lastSyncedAt: row.last_synced_at }));
    },
    async setMapping(habitId: string, metric: HealthMetric | null): Promise<void> {
      await db.withExclusiveTransactionAsync(async (tx) => {
        const current = await tx.getFirstAsync<{ metric: HealthMetric }>("SELECT metric FROM habit_health_mappings WHERE habit_id = ?", habitId);
        if (current && current.metric !== metric) {
          const habit = await tx.getFirstAsync<{ target_value: number }>("SELECT target_value FROM habits WHERE id = ?", habitId);
          const rows = await tx.getAllAsync<{ local_date: string; manual_value: number; state: string }>("SELECT local_date, manual_value, state FROM progress_entries WHERE habit_id = ? AND health_value > 0", habitId);
          for (const row of rows) {
            if (row.manual_value === 0 && row.state !== "failed" && row.state !== "skipped") await tx.runAsync("DELETE FROM progress_entries WHERE habit_id = ? AND local_date = ?", habitId, row.local_date);
            else {
              const explicit = row.state === "failed" || row.state === "skipped" ? row.state : undefined;
              await tx.runAsync("UPDATE progress_entries SET value = manual_value, health_value = 0, state = ? WHERE habit_id = ? AND local_date = ?", progressStateForValue(row.manual_value, habit?.target_value ?? 1, explicit), habitId, row.local_date);
            }
          }
          await tx.runAsync("DELETE FROM habit_health_values WHERE habit_id = ?", habitId);
        }
        if (metric === null) await tx.runAsync("DELETE FROM habit_health_mappings WHERE habit_id = ?", habitId);
        else await tx.runAsync("INSERT INTO habit_health_mappings (habit_id, metric, last_synced_at) VALUES (?, ?, NULL) ON CONFLICT(habit_id) DO UPDATE SET metric=excluded.metric, last_synced_at=NULL", habitId, metric);
      });
    },
    async applyDailyValues(habitId: string, metric: HealthMetric, targetValue: number, values: ReadonlyMap<string, number>, updatedAt: string): Promise<void> {
      await db.withExclusiveTransactionAsync(async (tx) => {
        for (const [date, healthValue] of values) {
          const existing = await tx.getFirstAsync<{ id: string; manual_value: number; state: string; note: string | null }>("SELECT id, manual_value, state, note FROM progress_entries WHERE habit_id = ? AND local_date = ?", habitId, date);
          const manualValue = existing?.manual_value ?? 0;
          const value = manualValue + healthValue;
          const explicit = existing?.state === "failed" || existing?.state === "skipped" ? existing.state : undefined;
          const state = progressStateForValue(value, targetValue, explicit);
          const id = existing?.id ?? `health-${habitId}-${date}`;
          await tx.runAsync("INSERT INTO habit_health_values (habit_id, local_date, metric, value, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(habit_id, local_date) DO UPDATE SET metric=excluded.metric, value=excluded.value, updated_at=excluded.updated_at", habitId, date, metric, healthValue, updatedAt);
          await tx.runAsync("INSERT INTO progress_entries (id, habit_id, local_date, value, state, recorded_at, note, manual_value, health_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(habit_id, local_date) DO UPDATE SET value=excluded.value, state=excluded.state, recorded_at=excluded.recorded_at, health_value=excluded.health_value", id, habitId, date, value, state, updatedAt, existing?.note ?? null, manualValue, healthValue);
        }
        await tx.runAsync("UPDATE habit_health_mappings SET last_synced_at = ? WHERE habit_id = ? AND metric = ?", updatedAt, habitId, metric);
      });
    },
  };
}
