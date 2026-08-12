import prisma from "../db.server";
import { dayOfWeek } from "./slotAvailability.server";

const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

export type ReportFilters = {
  bookableProductId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type BookingReportData = {
  totalBookings: number;
  confirmedCount: number;
  cancelledCount: number;
  overbookedCount: number;
  cancellationRatePercent: number;
  bookingsByProduct: { productTitle: string; count: number }[];
  bookingsByHour: { hour: string; count: number }[];
  bookingsByDayOfWeek: { day: string; count: number }[];
};

const REPORT_ROW_CAP = 5000;

export async function getBookingReportData(
  shop: string,
  filters: ReportFilters = {},
): Promise<BookingReportData> {
  const bookings = await prisma.booking.findMany({
    where: {
      shop,
      bookableProductId: filters.bookableProductId,
      date: {
        gte: filters.dateFrom || undefined,
        lte: filters.dateTo || undefined,
      },
    },
    include: { bookableProduct: { select: { productTitle: true } } },
    take: REPORT_ROW_CAP,
  });

  const totalBookings = bookings.length;
  const confirmedCount = bookings.filter(
    (b: { status: string }) => b.status === "CONFIRMED",
  ).length;
  const cancelledCount = bookings.filter(
    (b: { status: string }) => b.status === "CANCELLED",
  ).length;
  const overbookedCount = bookings.filter(
    (b: { status: string }) => b.status === "OVERBOOKED",
  ).length;
  const cancellationRatePercent =
    totalBookings === 0 ? 0 : Math.round((cancelledCount / totalBookings) * 1000) / 10;

  const byProduct = new Map<string, number>();
  const byHour = new Map<string, number>();
  const byDay = new Map<number, number>();

  for (const booking of bookings) {
    if (booking.status === "CANCELLED") continue;

    const productTitle = booking.bookableProduct.productTitle;
    byProduct.set(productTitle, (byProduct.get(productTitle) ?? 0) + 1);

    const hour = booking.slotStart.split(":")[0] + ":00";
    byHour.set(hour, (byHour.get(hour) ?? 0) + 1);

    const dow = dayOfWeek(booking.date);
    byDay.set(dow, (byDay.get(dow) ?? 0) + 1);
  }

  const bookingsByProduct = Array.from(byProduct.entries())
    .map(([productTitle, count]) => ({ productTitle, count }))
    .sort((a, b) => b.count - a.count);

  const bookingsByHour = Array.from(byHour.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  const bookingsByDayOfWeek = DAY_NAMES.map((day, index) => ({
    day,
    count: byDay.get(index) ?? 0,
  }));

  return {
    totalBookings,
    confirmedCount,
    cancelledCount,
    overbookedCount,
    cancellationRatePercent,
    bookingsByProduct,
    bookingsByHour,
    bookingsByDayOfWeek,
  };
}