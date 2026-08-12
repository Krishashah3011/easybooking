import type { Booking } from "@prisma/client";
import prisma from "../db.server";
import {
  getBookableProduct,
  resolveEffectiveSettings,
} from "./bookableProduct.server";
import { getBookingSettings } from "./bookingSettings.server";
import { computeSlotsForDate } from "./slotAvailability.server";
import { sendEmail } from "../utils/mailer.server";
import {
  confirmationEmail,
  reminderEmail,
  cancellationEmail,
} from "./emailTemplates.server";

export type OrderLineItem = {
  id: number | string;
  product_id: number | string | null;
  properties?: { name: string; value: string }[] | null;
};

export type OrderPayload = {
  id: number | string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  line_items?: OrderLineItem[];
};

const BOOKING_DATE_PROPERTY = "Booking Date";
const BOOKING_TIME_PROPERTY = "Booking Time";

function toProductGid(productId: number | string): string {
  return `gid://shopify/Product/${productId}`;
}

export function extractBookingSelection(
  lineItem: OrderLineItem,
): { date: string; time: string } | null {
  const properties = lineItem.properties ?? [];
  const date = properties.find((p) => p.name === BOOKING_DATE_PROPERTY)?.value;
  const time = properties.find((p) => p.name === BOOKING_TIME_PROPERTY)?.value;
  if (!date || !time) return null;
  return { date, time };
}

function resolveCustomerInfo(order: OrderPayload) {
  const name = [order.customer?.first_name, order.customer?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    customerName: name || null,
    customerEmail: order.email ?? order.customer?.email ?? null,
    customerPhone: order.phone ?? order.customer?.phone ?? null,
    isGuest: !order.customer,
  };
}

async function countConfirmedBookingsForSlot(
  shop: string,
  bookableProductId: string,
  slotStartsAt: Date,
): Promise<number> {
  return prisma.booking.count({
    where: {
      shop,
      bookableProductId,
      slotStartsAt,
      status: "CONFIRMED",
    },
  });
}

export async function getBookedCountsInRange(
  shop: string,
  bookableProductId: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<Map<string, number>> {
  const grouped = await prisma.booking.groupBy({
    by: ["slotStartsAt"],
    where: {
      shop,
      bookableProductId,
      status: "CONFIRMED",
      slotStartsAt: { gte: rangeStart, lte: rangeEnd },
    },
    _count: { _all: true },
  });

  const counts = new Map<string, number>();
  for (const row of grouped) {
    counts.set(row.slotStartsAt.toISOString(), row._count._all);
  }
  return counts;
}

async function getEmailFromName(shop: string): Promise<string | null> {
  try {
    const settings = await getBookingSettings(shop);
    return settings.emailFromName;
  } catch {
    return null;
  }
}

async function sendBookingConfirmation(
  booking: Booking,
  productTitle: string,
  shop: string,
): Promise<void> {
  if (!booking.customerEmail) return;

  const { subject, text, html } = confirmationEmail({
    productTitle,
    customerName: booking.customerName,
    date: booking.date,
    slotStart: booking.slotStart,
    slotEnd: booking.slotEnd,
    shopName: shop,
  });

  const fromName = await getEmailFromName(shop);
  const sent = await sendEmail({
    to: booking.customerEmail,
    subject,
    text,
    html,
    fromName,
  });
  if (sent) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { confirmationSentAt: new Date() },
    });
  }
}

async function sendBookingCancellation(
  booking: Booking,
  productTitle: string,
  shop: string,
): Promise<void> {
  if (!booking.customerEmail) return;

  const { subject, text, html } = cancellationEmail({
    productTitle,
    customerName: booking.customerName,
    date: booking.date,
    slotStart: booking.slotStart,
    slotEnd: booking.slotEnd,
    shopName: shop,
  });

  const fromName = await getEmailFromName(shop);
  await sendEmail({
    to: booking.customerEmail,
    subject,
    text,
    html,
    fromName,
  });
}

export async function createBookingsFromOrder(
  shop: string,
  order: OrderPayload,
): Promise<Booking[]> {
  const created: Booking[] = [];
  const shopSettings = await getBookingSettings(shop);
  const customerInfo = resolveCustomerInfo(order);

  for (const lineItem of order.line_items ?? []) {
    const selection = extractBookingSelection(lineItem);
    if (!selection || lineItem.product_id == null) {
      console.log(
        `Skipping line item ${lineItem.id}: no booking selection or product_id`,
        { selection, product_id: lineItem.product_id },
      );
      continue;
    }

    const existing = await prisma.booking.findFirst({
      where: {
        shop,
        orderId: String(order.id),
        lineItemId: String(lineItem.id),
      },
    });
    if (existing) {
      console.log(
        `Skipping line item ${lineItem.id}: booking already exists (order ${order.id})`,
      );
      continue;
    }

    const productGid = toProductGid(lineItem.product_id);
    const bookableProduct = await getBookableProduct(shop, productGid);
    if (!bookableProduct || !bookableProduct.isEnabled) {
      console.log(
        `Skipping line item ${lineItem.id}: product ${productGid} not bookable/enabled`,
        bookableProduct,
      );
      continue;
    }

    const effectiveSettings = resolveEffectiveSettings(
      shopSettings,
      bookableProduct,
    );
    const slotsForDate = computeSlotsForDate(
      effectiveSettings,
      selection.date,
      new Set(),
    );
    const matchedSlot = slotsForDate.find((s) => s.start === selection.time);
    const slotStartsAt = matchedSlot
      ? new Date(matchedSlot.startsAt)
      : new Date(`${selection.date}T${selection.time}:00Z`);
    const slotEnd =
      matchedSlot?.end ??
      addMinutes(selection.time, effectiveSettings.slotDurationMinutes);

    const alreadyBooked = await countConfirmedBookingsForSlot(
      shop,
      bookableProduct.id,
      slotStartsAt,
    );
    const status =
      alreadyBooked < effectiveSettings.maxBookingsPerSlot
        ? "CONFIRMED"
        : "OVERBOOKED";

    const booking = await prisma.booking.create({
      data: {
        shop,
        bookableProductId: bookableProduct.id,
        orderId: String(order.id),
        orderName: order.name ?? null,
        lineItemId: String(lineItem.id),
        customerName: customerInfo.customerName,
        customerEmail: customerInfo.customerEmail,
        customerPhone: customerInfo.customerPhone,
        isGuest: customerInfo.isGuest,
        date: selection.date,
        slotStart: selection.time,
        slotEnd,
        slotStartsAt,
        status,
        source: "STOREFRONT_ORDER",
      },
    });
    created.push(booking);
    if (status === "CONFIRMED") {
      await sendBookingConfirmation(
        booking,
        bookableProduct.productTitle,
        shop,
      );
    }
  }

  return created;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export async function cancelBookingsForOrder(
  shop: string,
  orderId: number | string,
): Promise<void> {
  const bookings = await prisma.booking.findMany({
    where: { shop, orderId: String(orderId), status: { not: "CANCELLED" } },
    include: { bookableProduct: { select: { productTitle: true } } },
  });

  for (const booking of bookings) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
    });
    await sendBookingCancellation(
      booking,
      booking.bookableProduct.productTitle,
      shop,
    );
  }
}

export type ManualBookingInput = {
  bookableProductId: string;
  date: string;
  slotStart: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
};

export type ManualBookingResult =
  { ok: true; booking: Booking } | { ok: false; error: string };

export async function createManualBooking(
  shop: string,
  input: ManualBookingInput,
): Promise<ManualBookingResult> {
  const bookableProduct = await prisma.bookableProduct.findFirst({
    where: { id: input.bookableProductId, shop },
  });
  if (!bookableProduct || !bookableProduct.isEnabled) {
    return { ok: false, error: "This product isn't enabled for booking." };
  }

  const shopSettings = await getBookingSettings(shop);
  const effectiveSettings = resolveEffectiveSettings(
    shopSettings,
    bookableProduct,
  );
  const slotsForDate = computeSlotsForDate(
    effectiveSettings,
    input.date,
    new Set(),
  );
  const matchedSlot = slotsForDate.find((s) => s.start === input.slotStart);
  if (!matchedSlot) {
    return {
      ok: false,
      error: "That date/time isn't a valid slot for this product.",
    };
  }

  const alreadyBooked = await countConfirmedBookingsForSlot(
    shop,
    bookableProduct.id,
    new Date(matchedSlot.startsAt),
  );
  if (alreadyBooked >= effectiveSettings.maxBookingsPerSlot) {
    return { ok: false, error: "That slot is already fully booked." };
  }

  const booking = await prisma.booking.create({
    data: {
      shop,
      bookableProductId: bookableProduct.id,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      isGuest: true,
      date: input.date,
      slotStart: matchedSlot.start,
      slotEnd: matchedSlot.end,
      slotStartsAt: new Date(matchedSlot.startsAt),
      status: "CONFIRMED",
      source: "ADMIN_MANUAL",
    },
  });

  await sendBookingConfirmation(booking, bookableProduct.productTitle, shop);

  return { ok: true, booking };
}

export async function listBookingsForProduct(
  shop: string,
  bookableProductId: string,
): Promise<Booking[]> {
  return prisma.booking.findMany({
    where: { shop, bookableProductId },
    orderBy: { slotStartsAt: "desc" },
    take: 50,
  });
}

export type BookingWithProductTitle = Booking & { productTitle: string };

export type ListBookingsFilters = {
  status?: "CONFIRMED" | "OVERBOOKED" | "CANCELLED";
  bookableProductId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function listBookings(
  shop: string,
  filters: ListBookingsFilters = {},
): Promise<BookingWithProductTitle[]> {
  const bookings = await prisma.booking.findMany({
    where: {
      shop,
      status: filters.status,
      bookableProductId: filters.bookableProductId,
      date: {
        gte: filters.dateFrom || undefined,
        lte: filters.dateTo || undefined,
      },
      ...(filters.search
        ? {
            OR: [
              {
                customerName: { contains: filters.search, mode: "insensitive" },
              },
              {
                customerEmail: {
                  contains: filters.search,
                  mode: "insensitive",
                },
              },
              { orderName: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { bookableProduct: { select: { productTitle: true } } },
    orderBy: { slotStartsAt: "desc" },
    take: 100,
  });

  return bookings.map(
    ({
      bookableProduct,
      ...booking
    }: Booking & { bookableProduct: { productTitle: string } }) => ({
      ...booking,
      productTitle: bookableProduct.productTitle,
    }),
  );
}

export async function cancelBooking(
  shop: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const booking = await prisma.booking.findFirst({
    where: { id, shop },
    include: { bookableProduct: { select: { productTitle: true } } },
  });
  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }
  if (booking.status !== "CANCELLED") {
    await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    await sendBookingCancellation(
      booking,
      booking.bookableProduct.productTitle,
      shop,
    );
  }
  return { ok: true };
}

export async function rescheduleBooking(
  shop: string,
  id: string,
  newDate: string,
  newSlotStart: string,
): Promise<{ ok: true; booking: Booking } | { ok: false; error: string }> {
  const booking = await prisma.booking.findFirst({
    where: { id, shop },
    include: { bookableProduct: true },
  });
  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }
  if (booking.status === "CANCELLED") {
    return { ok: false, error: "A cancelled booking can't be rescheduled." };
  }

  const shopSettings = await getBookingSettings(shop);
  const effectiveSettings = resolveEffectiveSettings(
    shopSettings,
    booking.bookableProduct,
  );
  const slotsForDate = computeSlotsForDate(
    effectiveSettings,
    newDate,
    new Set(),
  );
  const matchedSlot = slotsForDate.find((s) => s.start === newSlotStart);
  if (!matchedSlot) {
    return {
      ok: false,
      error: "That date/time isn't a valid slot for this product.",
    };
  }

  const otherBookingsInSlot = await prisma.booking.count({
    where: {
      shop,
      bookableProductId: booking.bookableProductId,
      slotStartsAt: new Date(matchedSlot.startsAt),
      status: "CONFIRMED",
      id: { not: id },
    },
  });
  if (otherBookingsInSlot >= effectiveSettings.maxBookingsPerSlot) {
    return { ok: false, error: "That slot is already fully booked." };
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      date: newDate,
      slotStart: matchedSlot.start,
      slotEnd: matchedSlot.end,
      slotStartsAt: new Date(matchedSlot.startsAt),
      status: "CONFIRMED",
      reminderSentAt: null,
    },
  });

  return { ok: true, booking: updated };
}

export async function sendDueReminders(
  windowHours = 24,
): Promise<{ sent: number; skipped: number }> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

  const dueBookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      slotStartsAt: { gte: now, lte: windowEnd },
    },
    include: { bookableProduct: { select: { productTitle: true } } },
  });

  let sent = 0;
  let skipped = 0;

  for (const booking of dueBookings) {
    if (!booking.customerEmail) {
      skipped += 1;
      continue;
    }

    const { subject, text, html } = reminderEmail({
      productTitle: booking.bookableProduct.productTitle,
      customerName: booking.customerName,
      date: booking.date,
      slotStart: booking.slotStart,
      slotEnd: booking.slotEnd,
      shopName: booking.shop,
    });

    const fromName = await getEmailFromName(booking.shop);
    const ok = await sendEmail({
      to: booking.customerEmail,
      subject,
      text,
      html,
      fromName,
    });
    if (ok) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { reminderSentAt: new Date() },
      });
      sent += 1;
    } else {
      skipped += 1;
    }
  }

  return { sent, skipped };
}