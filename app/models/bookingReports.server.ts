import prismaML from "../db.server";
import { dayOfWeekML } from "./slotAvailability.server";

const DAY_NAMES_ML = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

const MONTH_NAMES_ML = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
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
  bookingsByMonth: { month: string; count: number }[];
};

const REPORT_ROW_CAP_ML = 5000;

export async function getBookingReportDataML(
  shopML: string,
  filtersML: ReportFilters = {},
): Promise<BookingReportData> {
  const bookingsML = await prismaML.booking.findMany({
    where: {
      shop: shopML,
      bookableProductId: filtersML.bookableProductId,
      date: {
        gte: filtersML.dateFrom || undefined,
        lte: filtersML.dateTo || undefined,
      },
    },
    include: { bookableProduct: { select: { productTitle: true } } },
    take: REPORT_ROW_CAP_ML,
  });

  const totalBookingsML = bookingsML.length;
  const confirmedCountML = bookingsML.filter(
    (bML: { status: string }) => bML.status === "CONFIRMED",
  ).length;
  const cancelledCountML = bookingsML.filter(
    (bML: { status: string }) => bML.status === "CANCELLED",
  ).length;
  const overbookedCountML = bookingsML.filter(
    (bML: { status: string }) => bML.status === "OVERBOOKED",
  ).length;
  const cancellationRatePercentML =
    totalBookingsML === 0 ? 0 : Math.round((cancelledCountML / totalBookingsML) * 1000) / 10;

  const byProductML = new Map<string, number>();
  const byHourML = new Map<string, number>();
  const byDayML = new Map<number, number>();
  const byMonthML = new Map<number, number>();

  for (const bookingML of bookingsML) {
    if (bookingML.status === "CANCELLED") continue;

    const productTitleML = bookingML.bookableProduct.productTitle;
    byProductML.set(productTitleML, (byProductML.get(productTitleML) ?? 0) + 1);

    const hourML = bookingML.slotStart.split(":")[0] + ":00";
    byHourML.set(hourML, (byHourML.get(hourML) ?? 0) + 1);

    const dowML = dayOfWeekML(bookingML.date);
    byDayML.set(dowML, (byDayML.get(dowML) ?? 0) + 1);

    const monthIndexML = Number(bookingML.date.slice(5, 7)) - 1;
    if (monthIndexML >= 0 && monthIndexML < 12) {
      byMonthML.set(monthIndexML, (byMonthML.get(monthIndexML) ?? 0) + 1);
    }
  }

  const bookingsByProductML = Array.from(byProductML.entries())
    .map(([productTitleML, countML]) => ({ productTitle: productTitleML, count: countML }))
    .sort((aML, bML) => bML.count - aML.count);

  const bookingsByHourML = Array.from(byHourML.entries())
    .map(([hourML, countML]) => ({ hour: hourML, count: countML }))
    .sort((aML, bML) => aML.hour.localeCompare(bML.hour));

  const bookingsByDayOfWeekML = DAY_NAMES_ML.map((dayML, indexML) => ({
    day: dayML,
    count: byDayML.get(indexML) ?? 0,
  }));

  const bookingsByMonthML = MONTH_NAMES_ML.map((monthML, indexML) => ({
    month: monthML,
    count: byMonthML.get(indexML) ?? 0,
  }));

  return {
    totalBookings: totalBookingsML,
    confirmedCount: confirmedCountML,
    cancelledCount: cancelledCountML,
    overbookedCount: overbookedCountML,
    cancellationRatePercent: cancellationRatePercentML,
    bookingsByProduct: bookingsByProductML,
    bookingsByHour: bookingsByHourML,
    bookingsByDayOfWeek: bookingsByDayOfWeekML,
    bookingsByMonth: bookingsByMonthML,
  };
}