import { zonedTimeToUtcML } from "./timezones";

type CompletionInput = {
  bookingType: string;
  date: string;
  endDate?: string | null;
  slotEnd: string;
  locationTimezone?: string | null;
};

export function isBookingCompletedML(
  bookingML: CompletionInput,
  nowML: Date = new Date(),
): boolean {
  const endDateStrML =
    bookingML.bookingType === "MULTI_DAY"
      ? bookingML.endDate || bookingML.date
      : bookingML.date;
  const endTimeML = bookingML.bookingType === "MULTI_DAY" ? "23:59" : bookingML.slotEnd || "23:59";

  if (Number.isNaN(new Date(`${endDateStrML}T${endTimeML}:00Z`).getTime())) {
    return false;
  }
  const endsAtML = zonedTimeToUtcML(endDateStrML, endTimeML, bookingML.locationTimezone);
  if (Number.isNaN(endsAtML.getTime())) return false;
  return nowML.getTime() >= endsAtML.getTime();
}
const COMPLETABLE_STATUSES_ML = new Set(["CONFIRMED", "RESCHEDULED", "OVERBOOKED"]);

export function getDisplayStatusML(
  bookingML: CompletionInput & { status: string },
  nowML: Date = new Date(),
): string {
  if (COMPLETABLE_STATUSES_ML.has(bookingML.status) && isBookingCompletedML(bookingML, nowML)) {
    return "COMPLETED";
  }
  return bookingML.status;
}

export function belongsInCompletedTabML(
  bookingML: CompletionInput & { status: string },
  nowML: Date = new Date(),
): boolean {
  if (bookingML.status === "CANCELLED") {
    return isBookingCompletedML(bookingML, nowML);
  }
  return getDisplayStatusML(bookingML, nowML) === "COMPLETED";
}