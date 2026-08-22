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
  rescheduledEmail,
} from "./emailTemplates.server";
import { listCustomFields } from "./customBookingField.server";
import { formatDateDisplay } from "../utils/format";

const ACTIVE_BOOKING_STATUSES = ["CONFIRMED", "RESCHEDULED"] as const;

export type OrderLineItem = {
  id: number | string;
  product_id: number | string | null;
  quantity?: number | string;
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
const BOOKING_LOCATION_PROPERTY = "Location";

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

export function extractBookingLocation(lineItem: OrderLineItem): string | null {
  const properties = lineItem.properties ?? [];
  const location = properties.find(
    (p) => p.name === BOOKING_LOCATION_PROPERTY,
  )?.value;
  return location || null;
}

function extractCustomFieldResponses(
  lineItem: OrderLineItem,
  fields: { fieldKey: string; label: string }[],
): Record<string, string> | null {
  if (fields.length === 0) return null;

  const properties = lineItem.properties ?? [];
  const responses: Record<string, string> = {};

  for (const field of fields) {
    const value = properties.find((p) => p.name === field.label)?.value;
    if (value) {
      responses[field.fieldKey] = value;
    }
  }

  return Object.keys(responses).length > 0 ? responses : null;
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
  const result = await prisma.booking.aggregate({
    where: {
      shop,
      bookableProductId,
      slotStartsAt,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
    },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
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
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      slotStartsAt: { gte: rangeStart, lte: rangeEnd },
    },
    _sum: { quantity: true },
  });

  const counts = new Map<string, number>();
  for (const row of grouped) {
    counts.set(row.slotStartsAt.toISOString(), row._sum.quantity ?? 0);
  }
  return counts;
}

async function getShopEmailSettings(
  shop: string,
): Promise<{ fromName: string | null }> {
  try {
    const settings = await getBookingSettings(shop);
    return { fromName: settings.emailFromName };
  } catch {
    return { fromName: null };
  }
}

async function sendBookingConfirmation(
  booking: Booking,
  productTitle: string,
  shop: string,
): Promise<void> {
  if (!booking.customerEmail) return;

  const { fromName } = await getShopEmailSettings(shop);
  const { subject, text, html } = confirmationEmail({
    productTitle,
    customerName: booking.customerName,
    date: formatDateDisplay(booking.date),
    slotStart: booking.slotStart,
    slotEnd: booking.slotEnd,
    shopName: shop,
  });

  const sent = await sendEmail({
    shop,
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

  const { fromName } = await getShopEmailSettings(shop);
  const { subject, text, html } = cancellationEmail({
    productTitle,
    customerName: booking.customerName,
    date: formatDateDisplay(booking.date),
    slotStart: booking.slotStart,
    slotEnd: booking.slotEnd,
    shopName: shop,
  });

  await sendEmail({
    shop,
    to: booking.customerEmail,
    subject,
    text,
    html,
    fromName,
  });
}

async function sendBookingRescheduled(
  booking: Booking,
  productTitle: string,
  shop: string,
  previousDate: string,
  previousSlotStart: string,
  previousSlotEnd: string,
): Promise<void> {
  if (!booking.customerEmail) return;

  const { fromName } = await getShopEmailSettings(shop);
  const { subject, text, html } = rescheduledEmail({
    productTitle,
    customerName: booking.customerName,
    date: formatDateDisplay(booking.date),
    slotStart: booking.slotStart,
    slotEnd: booking.slotEnd,
    shopName: shop,
    previousDate: formatDateDisplay(previousDate),
    previousSlotStart,
    previousSlotEnd,
  });

  await sendEmail({
    shop,
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
  const customFields = await listCustomFields(shop);

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

    let slotStartsAt: Date;
    let slotEnd: string;
    let alreadyBooked: number;

    if (bookableProduct.bookingType === "FULL_DAY") {
      // A FULL_DAY booking has no time-slot math — the whole day is the
      // unit, so we skip computeSlotsForDate entirely and just anchor
      // the booking to midnight UTC of the chosen date.
      slotStartsAt = new Date(`${selection.date}T00:00:00.000Z`);
      slotEnd = "23:59";
      alreadyBooked = await countConfirmedBookingsForSlot(
        shop,
        bookableProduct.id,
        slotStartsAt,
      );
    } else {
      const slotsForDate = computeSlotsForDate(
        effectiveSettings,
        selection.date,
        new Set(),
      );
      const matchedSlot = slotsForDate.find((s) => s.start === selection.time);
      slotStartsAt = matchedSlot
        ? new Date(matchedSlot.startsAt)
        : new Date(`${selection.date}T${selection.time}:00Z`);
      slotEnd =
        matchedSlot?.end ??
        addMinutes(selection.time, effectiveSettings.slotDurationMinutes);
      alreadyBooked = await countConfirmedBookingsForSlot(
        shop,
        bookableProduct.id,
        slotStartsAt,
      );
    }

    const quantity = (() => {
      const n = Number(lineItem.quantity);
      return Number.isInteger(n) && n > 0 ? n : 1;
    })();
    const status =
      alreadyBooked + quantity <= effectiveSettings.maxBookingsPerSlot
        ? "CONFIRMED"
        : "OVERBOOKED";

    const customFieldResponses = extractCustomFieldResponses(
      lineItem,
      customFields,
    );

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
        location: extractBookingLocation(lineItem),
        date: selection.date,
        slotStart: selection.time,
        slotEnd,
        slotStartsAt,
        quantity,
        status,
        source: "STOREFRONT_ORDER",
        customFieldResponses: customFieldResponses ?? undefined,
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
  quantity?: number;
  location?: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customFieldResponses?: Record<string, string>;
  // Shared across every slot created from the same "New Booking" submission
  // when more than one date/time was queued, so they can be shown as one
  // entry in the Bookings list. Leave undefined for a single-slot booking.
  groupId?: string;
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
  const quantity =
    Number.isInteger(input.quantity) && (input.quantity as number) > 0
      ? (input.quantity as number)
      : 1;
  if (alreadyBooked + quantity > effectiveSettings.maxBookingsPerSlot) {
    return { ok: false, error: "That slot is already fully booked." };
  }

  const customFields = await listCustomFields(shop);
  const responses = input.customFieldResponses ?? {};
  for (const field of customFields) {
    if (field.required && !responses[field.fieldKey]?.trim()) {
      return { ok: false, error: `"${field.label}" is required.` };
    }
  }

  const booking = await prisma.booking.create({
    data: {
      shop,
      bookableProductId: bookableProduct.id,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      isGuest: true,
      location: input.location || null,
      date: input.date,
      slotStart: matchedSlot.start,
      slotEnd: matchedSlot.end,
      slotStartsAt: new Date(matchedSlot.startsAt),
      quantity,
      status: "CONFIRMED",
      source: "ADMIN_MANUAL",
      groupId: input.groupId,
      customFieldResponses:
        Object.keys(responses).length > 0 ? responses : undefined,
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
  status?: "CONFIRMED" | "OVERBOOKED" | "CANCELLED" | "RESCHEDULED";
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

export async function getUpcomingBookings(
  shop: string,
  limit = 5,
): Promise<BookingWithProductTitle[]> {
  const bookings = await prisma.booking.findMany({
    where: {
      shop,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      slotStartsAt: { gte: new Date() },
    },
    include: { bookableProduct: { select: { productTitle: true } } },
    orderBy: { slotStartsAt: "asc" },
    take: limit,
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

export type CountBookingsFilters = {
  status?: "CONFIRMED" | "OVERBOOKED" | "CANCELLED" | "RESCHEDULED";
  dateFrom?: string;
  dateTo?: string;
};

export async function countBookings(
  shop: string,
  filters: CountBookingsFilters = {},
): Promise<number> {
  return prisma.booking.count({
    where: {
      shop,
      status: filters.status,
      date: {
        gte: filters.dateFrom || undefined,
        lte: filters.dateTo || undefined,
      },
    },
  });
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

  const otherBookingsInSlot = await prisma.booking.aggregate({
    where: {
      shop,
      bookableProductId: booking.bookableProductId,
      slotStartsAt: new Date(matchedSlot.startsAt),
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      id: { not: id },
    },
    _sum: { quantity: true },
  });
  const otherQuantityInSlot = otherBookingsInSlot._sum.quantity ?? 0;
  if (
    otherQuantityInSlot + booking.quantity >
    effectiveSettings.maxBookingsPerSlot
  ) {
    return { ok: false, error: "That slot is already fully booked." };
  }

  const previousDate = booking.date;
  const previousSlotStart = booking.slotStart;
  const previousSlotEnd = booking.slotEnd;

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      date: newDate,
      slotStart: matchedSlot.start,
      slotEnd: matchedSlot.end,
      slotStartsAt: new Date(matchedSlot.startsAt),
      status: "RESCHEDULED",
      reminderSentAt: null,
    },
  });

  await sendBookingRescheduled(
    updated,
    booking.bookableProduct.productTitle,
    shop,
    previousDate,
    previousSlotStart,
    previousSlotEnd,
  );

  return { ok: true, booking: updated };
}

export async function listSlotsForReschedule(
  shop: string,
  bookingId: string,
  date: string,
): Promise
  | { ok: true; slots: import("./slotAvailability.server").TimeSlot[] }
  | { ok: false; error: string }
  {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, shop },
    include: { bookableProduct: true },
  });
  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }

  const shopSettings = await getBookingSettings(shop);
  const effectiveSettings = resolveEffectiveSettings(
    shopSettings,
    booking.bookableProduct,
  );

  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);
  const grouped = await prisma.booking.groupBy({
    by: ["slotStartsAt"],
    where: {
      shop,
      bookableProductId: booking.bookableProductId,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      slotStartsAt: { gte: dayStart, lte: dayEnd },
      id: { not: bookingId },
    },
    _sum: { quantity: true },
  });
  const bookedCounts = new Map<string, number>();
  for (const row of grouped) {
    bookedCounts.set(row.slotStartsAt.toISOString(), row._sum.quantity ?? 0);
  }

  const slots = computeSlotsForDate(
    effectiveSettings,
    date,
    new Set(),
    new Date(),
    bookedCounts,
  );

  return { ok: true, slots };
}

export async function sendDueReminders(
  windowHours = 24,
): Promise<{ sent: number; skipped: number }> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

  const dueBookings = await prisma.booking.findMany({
    where: {
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
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

    const { fromName } = await getShopEmailSettings(booking.shop);
    const { subject, text, html } = reminderEmail({
      productTitle: booking.bookableProduct.productTitle,
      customerName: booking.customerName,
      date: formatDateDisplay(booking.date),
      slotStart: booking.slotStart,
      slotEnd: booking.slotEnd,
      shopName: booking.shop,
    });

    const ok = await sendEmail({
      shop: booking.shop,
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