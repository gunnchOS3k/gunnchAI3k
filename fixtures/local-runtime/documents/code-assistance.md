# Local Code Assistance Pack (Approved Fixture)

source_id: fixtures/local-runtime/documents/code-assistance.md
approved: true
pack: local-code-assist-v1

## TypeScript Guard Pattern

Prefer early returns for invalid input. Keep side effects at the edges of a function. For local-only assistants, never open network sockets from helper code unless the caller explicitly opts into cloud mode.

## Example

```ts
function safeDivide(n: number, d: number): number | null {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
  return n / d;
}
```
