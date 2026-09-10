/** Small SQL boundary shared by Expo SQLite and the real SQLite integration tests. */
export type SqlValue = string | number | null;
export interface Connection {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: SqlValue[]): Promise<{ changes: number }>;
  getAllAsync<T>(sql: string, ...params: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: SqlValue[]): Promise<T | null>;
}
export interface Database extends Connection {
  withExclusiveTransactionAsync(
    task: (transaction: Connection) => Promise<void>,
  ): Promise<void>;
}
