//src/common/utils/decimal.util.ts
export function toNumberDecimal(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value && typeof value === 'object' && 'toString' in (value as Record<string, unknown>)) {
    return Number(String(value));
  }
  return 0;
}