import { useMemo } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { backupRepository } from "../features/backup/backup.repository";
export function useBackupRepository() { const db = useSQLiteContext(); return useMemo(() => backupRepository(db), [db]); }
