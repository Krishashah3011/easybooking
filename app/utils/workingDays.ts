export function parseWorkingDaysML(csvML: string): number[] {
  return csvML
    .split(",")
    .map((partML) => Number(partML.trim()))
    .filter((nML) => Number.isInteger(nML) && nML >= 0 && nML <= 6);
}