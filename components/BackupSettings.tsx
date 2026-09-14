import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Label, styles } from "./ui";
import { ActionButton } from "./ActionButton";
import { useBackupRepository } from "../hooks/useBackupRepository";
import type { HabitBackup } from "../features/backup/backup.repository";

export function BackupSettings() {
  const backupRepo = useBackupRepository();
  const [message, setMessage] = useState("Export a complete local backup, or preview a backup before replacing local data.");
  const [preview, setPreview] = useState<{ backup: HabitBackup; habits: number; progressEntries: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const exportBackup = async () => {
    setBusy(true);
    try {
      const backup = await backupRepo.export();
      const uri = `${FileSystem.cacheDirectory}habit-tracker-backup-${backup.exportedAt.slice(0, 10)}.json`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(backup, null, 2));
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "Export Habit Tracker backup" });
      else setMessage("Backup was created, but sharing is unavailable on this device.");
      setMessage(`Backup exported: ${backup.data.habits.length} habits and ${backup.data.progress_entries.length} progress entries.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Backup export failed."); }
    finally { setBusy(false); }
  };
  const chooseImport = async () => {
    setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true });
      if (result.canceled) return;
      const raw = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const next = backupRepo.preview(raw);
      setPreview(next); setMessage("Review the backup below before restoring it.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Backup import failed."); }
    finally { setBusy(false); }
  };
  const restore = async () => {
    if (!preview) return;
    setBusy(true);
    try { await backupRepo.restore(preview.backup); setPreview(null); setMessage("Backup restored. Local data was replaced safely."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Restore failed; local data was not changed."); }
    finally { setBusy(false); }
  };
  if (Platform.OS === "web") return null;
  return <View style={{ gap: 12 }}>
    <Label style={styles.heading}>Backup & Restore</Label><Label secondary style={{ lineHeight: 22 }}>{message}</Label>
    <ActionButton title={busy ? "Working…" : "Export backup"} disabled={busy} onPress={() => void exportBackup()} />
    <ActionButton title={busy ? "Working…" : "Choose backup to restore"} disabled={busy} onPress={() => void chooseImport()} />
    {preview ? <View style={{ gap: 10 }}><Label>Backup preview: {preview.habits} habits, {preview.progressEntries} progress entries.</Label><Label secondary>Restoring replaces all current local habits, progress, schedule history, timer and Health mappings.</Label><Pressable disabled={busy} accessibilityRole="button" onPress={() => void restore()} style={{ padding: 14, borderRadius: 12, backgroundColor: "#B6473C" }}><Label style={{ color: "white", textAlign: "center", fontWeight: "600" }}>Restore this backup</Label></Pressable></View> : null}
  </View>;
}
