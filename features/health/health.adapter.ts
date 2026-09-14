import type { HealthMetric, NormalizedHealthSample } from "./health.types";
export async function isHealthAvailable(): Promise<boolean> { return false; }
export async function requestHealthAuthorization(_metrics: readonly HealthMetric[]): Promise<boolean> { return false; }
export async function readHealthMetric(_metric: HealthMetric, _start: Date, _end: Date): Promise<NormalizedHealthSample[]> { return []; }
