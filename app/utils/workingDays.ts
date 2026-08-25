export function parseWorkingDays(csv: string): number[] {
  return csv
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
}
