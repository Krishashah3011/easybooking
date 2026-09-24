export type TwelveHourParts = { hour: string; minute: string; period: "AM" | "PM" };

export function to12HourPartsML(valueML: string | null | undefined): TwelveHourParts {
  const matchML = valueML ? /^(\d{1,2}):(\d{2})$/.exec(valueML) : null;
  if (!matchML) return { hour: "", minute: "", period: "AM" };
  const hour24ML = Number(matchML[1]);
  const periodML: "AM" | "PM" = hour24ML >= 12 ? "PM" : "AM";
  let hour12ML = hour24ML % 12;
  if (hour12ML === 0) hour12ML = 12;
  return { hour: String(hour12ML), minute: matchML[2], period: periodML };
}

export function fromTwelveHourPartsML(partsML: TwelveHourParts): string | null {
  const hour12ML = Number(partsML.hour);
  const minuteML = Number(partsML.minute);
  if (
    !partsML.hour ||
    !partsML.minute ||
    partsML.minute.length < 2 ||
    !Number.isFinite(hour12ML) ||
    hour12ML < 1 ||
    hour12ML > 12 ||
    !Number.isFinite(minuteML) ||
    minuteML < 0 ||
    minuteML > 59
  ) {
    return null;
  }
  let hour24ML = hour12ML % 12;
  if (partsML.period === "PM") hour24ML += 12;
  return `${String(hour24ML).padStart(2, "0")}:${String(minuteML).padStart(2, "0")}`;
}

export function sanitizeHourInputML(rawML: string): string {
  const digitsML = rawML.replace(/\D/g, "").slice(0, 2);
  if (digitsML === "") return "";
  const nML = Math.min(12, Math.max(0, Number(digitsML)));
  return nML === 0 ? digitsML : String(nML);
}

export function sanitizeMinuteInputML(rawML: string): string {
  const digitsML = rawML.replace(/\D/g, "").slice(0, 2);
  if (digitsML === "") return "";
  const nML = Math.min(59, Number(digitsML));
  return String(nML).padStart(digitsML.length, "0").slice(0, 2);
}