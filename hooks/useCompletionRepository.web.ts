import type { completionRepository } from "../features/completions/completion.repository";

export function useCompletionRepository(): ReturnType<
  typeof completionRepository
> {
  throw new Error("Completion storage is available in the iOS app.");
}
