/** Local-only identifier; uniqueness does not depend on a remote service. */
export function localIdentifier(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
