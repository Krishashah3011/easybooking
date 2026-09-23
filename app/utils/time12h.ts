export type TwelveHourParts = { hour: string; minute: string; period: "AM" | "PM" };

/** Parses a "HH:mm" (24h) string into 12-hour display parts. */
export function to12HourParts(value: string | null | undefined): TwelveHourParts {
  const match = value ? /^(\d{1,2}):(\d{2})$/.exec(value) : null;
  if (!match) return { hour: "", minute: "", period: "AM" };
  const hour24 = Number(match[1]);
  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour: String(hour12), minute: match[2], period };
}

/** Converts 12-hour parts back into a "HH:mm" (24h) string, or null if incomplete/invalid. */
export function fromTwelveHourParts(parts: TwelveHourParts): string | null {
  const hour12 = Number(parts.hour);
  const minute = Number(parts.minute);
  if (
    !parts.hour ||
    !parts.minute ||
    parts.minute.length < 2 ||
    !Number.isFinite(hour12) ||
    hour12 < 1 ||
    hour12 > 12 ||
    !Number.isFinite(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  let hour24 = hour12 % 12;
  if (parts.period === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Clamps free-typed digits to a valid 12-hour hour (1-12) as the user types. */
export function sanitizeHourInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 2);
  if (digits === "") return "";
  const n = Math.min(12, Math.max(0, Number(digits)));
  return n === 0 ? digits : String(n);
}

/** Clamps free-typed digits to a valid minute (0-59) as the user types. */
export function sanitizeMinuteInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 2);
  if (digits === "") return "";
  const n = Math.min(59, Number(digits));
  return String(n).padStart(digits.length, "0").slice(0, 2);
}
