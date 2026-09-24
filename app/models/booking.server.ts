import type { Booking, BookingType } from "@prisma/client";
import prismaML from "../db.server";
import {
  getBookableProductML,
  resolveEffectiveSettingsML,
} from "./bookableProduct.server";
import { getBookingSettingsML } from "./bookingSettings.server";
import {
  computeSlotsForDateML,
  computeFullDayAvailabilityML,
  computeMultiDayNightAvailabilityML,
} from "./slotAvailability.server";
import { resolveBookingContextByIdML } from "./booking-context.server";
import { sendEmailML } from "../utils/mailer.server";
import {
  confirmationEmailML,
  bundleConfirmationEmailML,
  reminderEmailML,
  cancellationEmailML,
  rescheduledEmailML,
} from "./emailTemplate.server";
import { listCustomFieldsML } from "./customBookingField.server";
import { getLocationByIdML } from "./bookingLocation.server";
import {
  dateStrInTimezoneML,
  localDayRangeUtcML,
  zonedTimeToUtcML,
} from "../utils/timezones";
import { formatDateDisplayML } from "../utils/format";
import { getDisplayStatusML, belongsInCompletedTabML } from "../utils/bookingStatus";

const ACTIVE_BOOKING_STATUSES_ML = ["CONFIRMED", "RESCHEDULED"] as const;

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
  created_at?: string | null;
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  line_items?: OrderLineItem[];
};

const BOOKING_DATE_PROPERTY_ML = "Booking Date";
const BOOKING_TIME_PROPERTY_ML = "Booking Time";
const BOOKING_LOCATION_PROPERTY_ML = "Location";
const BOOKING_LOCATION_ID_PROPERTY_ML = "_Location Id";
const BOOKING_CHECKOUT_DATE_PROPERTY_ML = "Checkout Date";
const BOOKING_NOTE_PROPERTY_ML = "Note";

function toProductGidML(productIdML: number | string): string {
  return `gid://shopify/Product/${productIdML}`;
}

export function extractBookingSelectionML(
  lineItemML: OrderLineItem,
): { date: string; time: string; checkoutDate: string | null } | null {
  const propertiesML = lineItemML.properties ?? [];
  const dateML = propertiesML.find((pML) => pML.name === BOOKING_DATE_PROPERTY_ML)?.value;
  const timeML = propertiesML.find((pML) => pML.name === BOOKING_TIME_PROPERTY_ML)?.value;
  const checkoutDateML =
    propertiesML.find((pML) => pML.name === BOOKING_CHECKOUT_DATE_PROPERTY_ML)?.value ??
    null;
  if (!dateML || !timeML) return null;
  return { date: dateML, time: timeML, checkoutDate: checkoutDateML };
}

export function extractBookingLocationML(lineItemML: OrderLineItem): string | null {
  const propertiesML = lineItemML.properties ?? [];
  const locationML = propertiesML.find(
    (pML) => pML.name === BOOKING_LOCATION_PROPERTY_ML,
  )?.value;
  return locationML || null;
}

export function extractBookingLocationIdML(lineItemML: OrderLineItem): string | null {
  const propertiesML = lineItemML.properties ?? [];
  const locationIdML = propertiesML.find(
    (pML) => pML.name === BOOKING_LOCATION_ID_PROPERTY_ML,
  )?.value;
  return locationIdML || null;
}

async function resolveBookingLocationML(
  shopML: string,
  lineItemML: OrderLineItem,
): Promise<{
  id: string;
  name: string;
  timezone: string;
  workingDays: string | null;
  dailyStartTime: string | null;
  dailyEndTime: string | null;
} | null> {
  const locationIdML = extractBookingLocationIdML(lineItemML);
  if (!locationIdML) return null;
  const locationML = await getLocationByIdML(shopML, locationIdML);
  if (!locationML) {
    console.warn(
      `Line item ${lineItemML.id}: Location Id "${locationIdML}" from cart properties doesn't match any BookingLocation for ${shopML} (deleted, or belongs to another shop?) — falling back to UTC for this booking's times.`,
    );
    return null;
  }
  return {
    id: locationML.id,
    name: locationML.name,
    timezone: locationML.timezone,
    workingDays: locationML.workingDays,
    dailyStartTime: locationML.dailyStartTime,
    dailyEndTime: locationML.dailyEndTime,
  };
}

export function extractBundleSessionsML(
  lineItemML: OrderLineItem,
  sessionCountML: number,
): { date: string; time: string }[] {
  const propertiesML = lineItemML.properties ?? [];
  const sessionsML: { date: string; time: string }[] = [];

  const firstDateML = propertiesML.find((pML) => pML.name === BOOKING_DATE_PROPERTY_ML)?.value;
  const firstTimeML = propertiesML.find((pML) => pML.name === BOOKING_TIME_PROPERTY_ML)?.value;
  if (firstDateML && firstTimeML) sessionsML.push({ date: firstDateML, time: firstTimeML });

  for (let iML = 2; iML <= sessionCountML; iML++) {
    const dateML = propertiesML.find((pML) => pML.name === `Session ${iML} Date`)?.value;
    const timeML = propertiesML.find((pML) => pML.name === `Session ${iML} Time`)?.value;
    if (dateML && timeML) sessionsML.push({ date: dateML, time: timeML });
  }

  return sessionsML;
}

export function extractBookingNoteML(lineItemML: OrderLineItem): string | null {
  const propertiesML = lineItemML.properties ?? [];
  const noteML = propertiesML.find((pML) => pML.name === BOOKING_NOTE_PROPERTY_ML)?.value;
  return noteML && noteML.trim() ? noteML.trim() : null;
}

function extractCustomFieldResponsesML(
  lineItemML: OrderLineItem,
  fieldsML: { fieldKey: string; label: string }[],
): Record<string, string> | null {
  if (fieldsML.length === 0) return null;

  const propertiesML = lineItemML.properties ?? [];
  const responsesML: Record<string, string> = {};

  for (const fieldML of fieldsML) {
    const valueML = propertiesML.find((pML) => pML.name === fieldML.label)?.value;
    if (valueML) {
      responsesML[fieldML.fieldKey] = valueML;
    }
  }

  return Object.keys(responsesML).length > 0 ? responsesML : null;
}

function resolveCustomerInfoML(orderML: OrderPayload) {
  const nameML = [orderML.customer?.first_name, orderML.customer?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    customerName: nameML || null,
    customerEmail: orderML.email ?? orderML.customer?.email ?? null,
    customerPhone: orderML.phone ?? orderML.customer?.phone ?? null,
    isGuest: !orderML.customer,
  };
}

function locationCapacityScopeML(locationIdML?: string | null) {
  return locationIdML ? { OR: [{ locationId: locationIdML }, { locationId: null }] } : {};
}

async function countConfirmedBookingsForSlotML(
  shopML: string,
  bookableProductIdML: string,
  slotStartsAtML: Date,
  locationIdML?: string | null,
): Promise<number> {
  const resultML = await prismaML.booking.aggregate({
    where: {
      shop: shopML,
      bookableProductId: bookableProductIdML,
      slotStartsAt: slotStartsAtML,
      status: { in: [...ACTIVE_BOOKING_STATUSES_ML] },
      ...locationCapacityScopeML(locationIdML),
    },
    _sum: { quantity: true },
  });
  return resultML._sum.quantity ?? 0;
}

export async function getBookedCountsInRangeML(
  shopML: string,
  bookableProductIdML: string,
  rangeStartML: Date,
  rangeEndML: Date,
  locationIdML?: string | null,
): Promise<Map<string, number>> {
  const groupedML = await prismaML.booking.groupBy({
    by: ["slotStartsAt"],
    where: {
      shop: shopML,
      bookableProductId: bookableProductIdML,
      status: { in: [...ACTIVE_BOOKING_STATUSES_ML] },
      slotStartsAt: { gte: rangeStartML, lte: rangeEndML },
      ...locationCapacityScopeML(locationIdML),
    },
    _sum: { quantity: true },
  });

  const countsML = new Map<string, number>();
  for (const rowML of groupedML) {
    countsML.set(rowML.slotStartsAt.toISOString(), rowML._sum.quantity ?? 0);
  }
  return countsML;
}

export async function getBookedNightCountsInRangeML(
  shopML: string,
  bookableProductIdML: string,
  rangeStartML: Date,
  rangeEndML: Date,
  locationIdML?: string | null,
): Promise<Map<string, number>> {
  const rangeStartStrML = rangeStartML.toISOString().slice(0, 10);
  const rangeEndStrML = rangeEndML.toISOString().slice(0, 10);

  const overlappingML = await prismaML.booking.findMany({
    where: {
      shop: shopML,
      bookableProductId: bookableProductIdML,
      status: { in: [...ACTIVE_BOOKING_STATUSES_ML] },
      date: { lte: rangeEndStrML },
      endDate: { gte: rangeStartStrML },
      ...locationCapacityScopeML(locationIdML),
    },
    select: { date: true, endDate: true, quantity: true },
  });

  const countsML = new Map<string, number>();
  for (const bookingML of overlappingML) {
    if (!bookingML.endDate) continue;
    let cursorML = bookingML.date < rangeStartStrML ? rangeStartStrML : bookingML.date;
    const stopML = bookingML.endDate > rangeEndStrML ? rangeEndStrML : bookingML.endDate;
    while (cursorML < stopML) {
      countsML.set(cursorML, (countsML.get(cursorML) ?? 0) + bookingML.quantity);
      const dML = new Date(`${cursorML}T00:00:00.000Z`);
      dML.setUTCDate(dML.getUTCDate() + 1);
      cursorML = dML.toISOString().slice(0, 10);
    }
  }
  return countsML;
}

async function countOverlappingMultiDayBookingsML(
  shopML: string,
  bookableProductIdML: string,
  checkinML: string,
  checkoutML: string,
  optionsML: { excludeBookingId?: string; locationId?: string | null } = {},
): Promise<number> {
  const { excludeBookingId: excludeBookingIdML, locationId: locationIdML } = optionsML;
  const overlappingML = await prismaML.booking.findMany({
    where: {
      shop: shopML,
      bookableProductId: bookableProductIdML,
      status: { in: [...ACTIVE_BOOKING_STATUSES_ML] },
      date: { lt: checkoutML },
      endDate: { gt: checkinML },
      ...(excludeBookingIdML ? { id: { not: excludeBookingIdML } } : {}),
      ...locationCapacityScopeML(locationIdML),
    },
    select: { quantity: true },
  });
  return overlappingML.reduce((sumML, bML) => sumML + bML.quantity, 0);
}

async function getShopEmailSettingsML(
  shopML: string,
): Promise<{ fromName: string | null }> {
  try {
    const settingsML = await getBookingSettingsML(shopML);
    return { fromName: settingsML.emailFromName };
  } catch {
    return { fromName: null };
  }
}

async function sendBookingConfirmationML(
  bookingML: Booking,
  productTitleML: string,
  shopML: string,
): Promise<void> {
  if (!bookingML.customerEmail) return;

  const { fromName: fromNameML } = await getShopEmailSettingsML(shopML);
  const { subject: subjectML, text: textML, html: htmlML } = await confirmationEmailML(shopML, {
    productTitle: productTitleML,
    customerName: bookingML.customerName,
    date: formatDateDisplayML(bookingML.date),
    slotStart: bookingML.slotStart,
    slotEnd: bookingML.slotEnd,
    shopName: shopML,
  });

  const sentML = await sendEmailML({
    shop: shopML,
    to: bookingML.customerEmail,
    subject: subjectML,
    text: textML,
    html: htmlML,
    fromName: fromNameML,
  });
  if (sentML) {
    await prismaML.booking.update({
      where: { id: bookingML.id },
      data: { confirmationSentAt: new Date() },
    });
  }
}

async function sendBundleBookingConfirmationML(
  bookingsML: Booking[],
  productTitleML: string,
  shopML: string,
): Promise<void> {
  if (bookingsML.length === 0) return;
  const firstML = bookingsML[0];
  if (!firstML.customerEmail) return;

  const { fromName: fromNameML } = await getShopEmailSettingsML(shopML);
  const { subject: subjectML, text: textML, html: htmlML } = await bundleConfirmationEmailML(shopML, {
    productTitle: productTitleML,
    customerName: firstML.customerName,
    sessions: bookingsML.map((bML) => ({
      date: formatDateDisplayML(bML.date),
      slotStart: bML.slotStart,
      slotEnd: bML.slotEnd,
    })),
    shopName: shopML,
  });

  const sentML = await sendEmailML({
    shop: shopML,
    to: firstML.customerEmail,
    subject: subjectML,
    text: textML,
    html: htmlML,
    fromName: fromNameML,
  });
  if (sentML) {
    await prismaML.booking.updateMany({
      where: { id: { in: bookingsML.map((bML) => bML.id) } },
      data: { confirmationSentAt: new Date() },
    });
  }
}

async function sendBookingCancellationML(
  bookingML: Booking,
  productTitleML: string,
  shopML: string,
): Promise<void> {
  if (!bookingML.customerEmail) return;

  const { fromName: fromNameML } = await getShopEmailSettingsML(shopML);
  const { subject: subjectML, text: textML, html: htmlML } = await cancellationEmailML(shopML, {
    productTitle: productTitleML,
    customerName: bookingML.customerName,
    date: formatDateDisplayML(bookingML.date),
    slotStart: bookingML.slotStart,
    slotEnd: bookingML.slotEnd,
    shopName: shopML,
  });

  await sendEmailML({
    shop: shopML,
    to: bookingML.customerEmail,
    subject: subjectML,
    text: textML,
    html: htmlML,
    fromName: fromNameML,
  });
}

async function sendBookingRescheduledML(
  bookingML: Booking,
  productTitleML: string,
  shopML: string,
  previousDateML: string,
  previousSlotStartML: string,
  previousSlotEndML: string,
): Promise<void> {
  if (!bookingML.customerEmail) return;

  const { fromName: fromNameML } = await getShopEmailSettingsML(shopML);
  const { subject: subjectML, text: textML, html: htmlML } = await rescheduledEmailML(shopML, {
    productTitle: productTitleML,
    customerName: bookingML.customerName,
    date: formatDateDisplayML(bookingML.date),
    slotStart: bookingML.slotStart,
    slotEnd: bookingML.slotEnd,
    shopName: shopML,
    previousDate: formatDateDisplayML(previousDateML),
    previousSlotStart: previousSlotStartML,
    previousSlotEnd: previousSlotEndML,
  });

  const sentML = await sendEmailML({
    shop: shopML,
    to: bookingML.customerEmail,
    subject: subjectML,
    text: textML,
    html: htmlML,
    fromName: fromNameML,
  });
  if (sentML) {
    await prismaML.booking.update({
      where: { id: bookingML.id },
      data: { confirmationSentAt: new Date() },
    });
  }
}

function nightsInRangeML(checkinML: string, checkoutML: string): string[] {
  const nightsML: string[] = [];
  const startML = Date.parse(`${checkinML}T00:00:00Z`);
  const endML = Date.parse(`${checkoutML}T00:00:00Z`);
  if (!Number.isFinite(startML) || !Number.isFinite(endML)) return nightsML;
  for (let tML = startML; tML < endML && nightsML.length < 366; tML += 86400000) {
    nightsML.push(new Date(tML).toISOString().slice(0, 10));
  }
  return nightsML;
}

export async function createBookingsFromOrderML(
  shopML: string,
  orderML: OrderPayload,
): Promise<Booking[]> {
  const createdML: Booking[] = [];
  const shopSettingsML = await getBookingSettingsML(shopML);
  const customerInfoML = resolveCustomerInfoML(orderML);
  const customFieldsML = await listCustomFieldsML(shopML);

  for (const lineItemML of orderML.line_items ?? []) {
    const selectionML = extractBookingSelectionML(lineItemML);
    if (!selectionML || lineItemML.product_id == null) {
      continue;
    }

    const existingML = await prismaML.booking.findFirst({
      where: {
        shop: shopML,
        orderId: String(orderML.id),
        lineItemId: String(lineItemML.id),
      },
    });
    if (existingML) {
      continue;
    }

    const productGidML = toProductGidML(lineItemML.product_id);
    const bookableProductML = await getBookableProductML(shopML, productGidML);
    if (!bookableProductML || !bookableProductML.isEnabled) {
      continue;
    }

    const resolvedLocationML = await resolveBookingLocationML(shopML, lineItemML);
    if (!resolvedLocationML) {
      console.warn(
        `Order ${orderML.id} line item ${lineItemML.id}: no valid location resolved — this booking's date/time will be computed in raw UTC, not a real business timezone.`,
      );
    }

    const effectiveSettingsML = resolveEffectiveSettingsML(
      shopSettingsML,
      bookableProductML,
      resolvedLocationML,
    );

    const bookingContextML = await resolveBookingContextByIdML(
      shopML,
      bookableProductML.id,
      resolvedLocationML?.id ?? null,
    );
    const blackoutDatesML = bookingContextML?.blackoutDates ?? new Set<string>();
    const checkSettingsML = {
      ...effectiveSettingsML,
      minAdvanceHours: 0,
      maxAdvanceDays: 36500,
    };
    const checkNowML = new Date();
    const todayInLocationML = dateStrInTimezoneML(
      checkNowML,
      resolvedLocationML?.timezone ?? null,
    );
    const flagInvalidML = (reasonML: string): true => {
      console.warn(
        `Order ${orderML.id} line item ${lineItemML.id}: ${reasonML} — marked OVERBOOKED for merchant review.`,
      );
      return true;
    };

    const customFieldResponsesML = extractCustomFieldResponsesML(
      lineItemML,
      customFieldsML,
    );
    const customerNoteML = extractBookingNoteML(lineItemML);
    const quantityML = (() => {
      const nML = Number(lineItemML.quantity);
      return Number.isInteger(nML) && nML > 0 ? nML : 1;
    })();

    if (bookableProductML.bookingType === "BUNDLE") {
      const sessionCountML = bookableProductML.bundleSessionCount ?? 1;
      const sessionsML = extractBundleSessionsML(lineItemML, sessionCountML);
      if (sessionsML.length === 0) {
        continue;
      }

      let bundleValidityDeadlineStrML: string | null = null;
      if (bookableProductML.bundleValidityDays != null) {
        const firstSessionDateML = sessionsML.map((sessionML) => sessionML.date).sort()[0];
        const deadlineML = new Date(`${firstSessionDateML}T00:00:00.000Z`);
        deadlineML.setUTCDate(deadlineML.getUTCDate() + bookableProductML.bundleValidityDays);
        bundleValidityDeadlineStrML = deadlineML.toISOString().slice(0, 10);
      }

      const groupIdML = `${orderML.id}-${lineItemML.id}`;
      const bundleBookingsML: Booking[] = [];
      for (const sessionML of sessionsML) {
        const slotsForDateML = computeSlotsForDateML(
          checkSettingsML,
          sessionML.date,
          blackoutDatesML,
          checkNowML,
          new Map(),
          resolvedLocationML?.timezone ?? null,
        );
        const matchedSlotML = slotsForDateML.find((sML) => sML.start === sessionML.time);
        const sessionInvalidML = !matchedSlotML
          ? flagInvalidML(
              `session ${sessionML.date} ${sessionML.time} isn't a bookable slot (already started, blackout date, non-working day, or time not offered)`,
            )
          : false;
        const sessionSlotStartsAtML = matchedSlotML
          ? new Date(matchedSlotML.startsAt)
          : zonedTimeToUtcML(
              sessionML.date,
              sessionML.time,
              resolvedLocationML?.timezone ?? null,
            );
        const sessionSlotEndML =
          matchedSlotML?.end ??
          addMinutesML(sessionML.time, effectiveSettingsML.slotDurationMinutes);
        const sessionAlreadyBookedML = await countConfirmedBookingsForSlotML(
          shopML,
          bookableProductML.id,
          sessionSlotStartsAtML,
          resolvedLocationML?.id,
        );
        const outsideValidityWindowML =
          bundleValidityDeadlineStrML !== null && sessionML.date > bundleValidityDeadlineStrML;
        const sessionStatusML =
          outsideValidityWindowML ||
          sessionInvalidML ||
          sessionAlreadyBookedML + quantityML > effectiveSettingsML.maxBookingsPerSlot
            ? "OVERBOOKED"
            : "CONFIRMED";
        if (outsideValidityWindowML) {
          console.warn(
            `Order ${orderML.id} line item ${lineItemML.id}: session on ${sessionML.date} falls outside the ${bookableProductML.bundleValidityDays}-day validity window (deadline ${bundleValidityDeadlineStrML}) — marked OVERBOOKED for merchant review.`,
          );
        }

        const bookingML = await prismaML.booking.create({
          data: {
            shop: shopML,
            bookableProductId: bookableProductML.id,
            orderId: String(orderML.id),
            orderName: orderML.name ?? null,
            lineItemId: String(lineItemML.id),
            groupId: groupIdML,
            customerName: customerInfoML.customerName,
            customerEmail: customerInfoML.customerEmail,
            customerPhone: customerInfoML.customerPhone,
            isGuest: customerInfoML.isGuest,
            location: extractBookingLocationML(lineItemML) ?? resolvedLocationML?.name ?? null,
            locationId: resolvedLocationML?.id ?? null,
            date: sessionML.date,
            slotStart: sessionML.time,
            slotEnd: sessionSlotEndML,
            slotStartsAt: sessionSlotStartsAtML,
            quantity: quantityML,
            status: sessionStatusML,
            source: "STOREFRONT_ORDER",
            note: customerNoteML ?? undefined,
            customFieldResponses: customFieldResponsesML ?? undefined,
          },
        });
        createdML.push(bookingML);
        bundleBookingsML.push(bookingML);
      }

      const confirmedBundleBookingsML = bundleBookingsML.filter(
        (bML) => bML.status === "CONFIRMED",
      );
      if (confirmedBundleBookingsML.length > 0) {
        await sendBundleBookingConfirmationML(
          confirmedBundleBookingsML,
          bookableProductML.productTitle,
          shopML,
        );
      }
      continue;
    }

    let slotStartsAtML: Date;
    let slotEndML: string;
    let alreadyBookedML: number;
    let bookingEndDateFieldML: string | null = null;
    let invalidSelectionML = false;

    if (bookableProductML.bookingType === "MULTI_DAY") {
      const checkoutML = selectionML.checkoutDate ?? selectionML.date;
      bookingEndDateFieldML = checkoutML;
      slotStartsAtML = new Date(`${selectionML.date}T00:00:00.000Z`);
      slotEndML = "00:00";
      alreadyBookedML = await countOverlappingMultiDayBookingsML(
        shopML,
        bookableProductML.id,
        selectionML.date,
        checkoutML,
        { locationId: resolvedLocationML?.id },
      );

      const nightsML = nightsInRangeML(selectionML.date, checkoutML);
      if (checkoutML <= selectionML.date) {
        invalidSelectionML = flagInvalidML("check-out isn't after check-in");
      } else if (selectionML.date < todayInLocationML) {
        invalidSelectionML = flagInvalidML(`check-in ${selectionML.date} is in the past`);
      } else if (
        bookableProductML.minNights !== null &&
        nightsML.length < bookableProductML.minNights
      ) {
        invalidSelectionML = flagInvalidML(
          `stay of ${nightsML.length} night(s) is below the ${bookableProductML.minNights}-night minimum`,
        );
      } else if (
        bookableProductML.maxNights !== null &&
        nightsML.length > bookableProductML.maxNights
      ) {
        invalidSelectionML = flagInvalidML(
          `stay of ${nightsML.length} night(s) is above the ${bookableProductML.maxNights}-night maximum`,
        );
      } else if (
        nightsML.some(
          (nightML) =>
            !computeMultiDayNightAvailabilityML(checkSettingsML, nightML, blackoutDatesML, checkNowML, 0)
              .available,
        )
      ) {
        invalidSelectionML = flagInvalidML(
          "one or more nights are unavailable (blackout date or outside the bookable window)",
        );
      }
    } else if (bookableProductML.bookingType === "FULL_DAY") {
      slotStartsAtML = new Date(`${selectionML.date}T00:00:00.000Z`);
      slotEndML = effectiveSettingsML.dailyEndTime;
      alreadyBookedML = await countConfirmedBookingsForSlotML(
        shopML,
        bookableProductML.id,
        slotStartsAtML,
        resolvedLocationML?.id,
      );

      if (selectionML.date < todayInLocationML) {
        invalidSelectionML = flagInvalidML(`date ${selectionML.date} is in the past`);
      } else if (
        !computeFullDayAvailabilityML(checkSettingsML, selectionML.date, blackoutDatesML, checkNowML, 0)
          .available
      ) {
        invalidSelectionML = flagInvalidML(
          `date ${selectionML.date} isn't bookable (blackout date, non-working day, or outside the bookable window)`,
        );
      }
    } else {
      const slotsForDateML = computeSlotsForDateML(
        checkSettingsML,
        selectionML.date,
        blackoutDatesML,
        checkNowML,
        new Map(),
        resolvedLocationML?.timezone ?? null,
      );
      const matchedSlotML = slotsForDateML.find((sML) => sML.start === selectionML.time);
      if (!matchedSlotML) {
        invalidSelectionML = flagInvalidML(
          `${selectionML.date} ${selectionML.time} isn't a bookable slot (already started, blackout date, non-working day, or time not offered)`,
        );
      }
      slotStartsAtML = matchedSlotML
        ? new Date(matchedSlotML.startsAt)
        : zonedTimeToUtcML(
            selectionML.date,
            selectionML.time,
            resolvedLocationML?.timezone ?? null,
          );
      slotEndML =
        matchedSlotML?.end ??
        addMinutesML(selectionML.time, effectiveSettingsML.slotDurationMinutes);
      alreadyBookedML = await countConfirmedBookingsForSlotML(
        shopML,
        bookableProductML.id,
        slotStartsAtML,
        resolvedLocationML?.id,
      );
    }

    const statusML =
      !invalidSelectionML &&
      alreadyBookedML + quantityML <= effectiveSettingsML.maxBookingsPerSlot
        ? "CONFIRMED"
        : "OVERBOOKED";

    const bookingML = await prismaML.booking.create({
      data: {
        shop: shopML,
        bookableProductId: bookableProductML.id,
        orderId: String(orderML.id),
        orderName: orderML.name ?? null,
        lineItemId: String(lineItemML.id),
        customerName: customerInfoML.customerName,
        customerEmail: customerInfoML.customerEmail,
        customerPhone: customerInfoML.customerPhone,
        isGuest: customerInfoML.isGuest,
        location: extractBookingLocationML(lineItemML) ?? resolvedLocationML?.name ?? null,
        locationId: resolvedLocationML?.id ?? null,
        date: selectionML.date,
        endDate: bookingEndDateFieldML,
        slotStart: selectionML.time,
        slotEnd: slotEndML,
        slotStartsAt: slotStartsAtML,
        quantity: quantityML,
        status: statusML,
        source: "STOREFRONT_ORDER",
        note: customerNoteML ?? undefined,
        customFieldResponses: customFieldResponsesML ?? undefined,
      },
    });
    createdML.push(bookingML);
    if (statusML === "CONFIRMED") {
      await sendBookingConfirmationML(
        bookingML,
        bookableProductML.productTitle,
        shopML,
      );
    }
  }

  return createdML;
}

function addMinutesML(timeML: string, minutesML: number): string {
  const [hML, mML] = timeML.split(":").map(Number);
  const totalML = hML * 60 + mML + minutesML;
  const hhML = Math.floor(totalML / 60) % 24;
  const mmML = totalML % 60;
  return `${String(hhML).padStart(2, "0")}:${String(mmML).padStart(2, "0")}`;
}

export async function cancelBookingsForOrderML(
  shopML: string,
  orderIdML: number | string,
): Promise<void> {
  const bookingsML = await prismaML.booking.findMany({
    where: { shop: shopML, orderId: String(orderIdML), status: { not: "CANCELLED" } },
    include: { bookableProduct: { select: { productTitle: true } } },
  });

  for (const bookingML of bookingsML) {
    await prismaML.booking.update({
      where: { id: bookingML.id },
      data: { status: "CANCELLED" },
    });
    await sendBookingCancellationML(
      bookingML,
      bookingML.bookableProduct.productTitle,
      shopML,
    );
  }
}

export type ManualBookingInput = {
  bookableProductId: string;
  date: string;
  slotStart: string;
  endDate?: string | null;
  quantity?: number;
  location?: string | null;
  locationId?: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customFieldResponses?: Record<string, string>;
  groupId?: string;
};

export type ManualBookingResult =
  | { ok: true; booking: Booking; productTitle: string; bookingType: BookingType }
  | { ok: false; error: string };

export function sendManualBookingEmailsInBackgroundML(
  shopML: string,
  createdML: { booking: Booking; productTitle: string; bookingType: BookingType }[],
): void {
  void (async () => {
    const bundleGroupsML = new Map<string, Booking[]>();
    const titlesML = new Map<string, string>();
    const singlesML: { booking: Booking; productTitle: string }[] = [];

    for (const entryML of createdML) {
      if (entryML.bookingType === "BUNDLE") {
        const keyML = entryML.booking.bookableProductId;
        bundleGroupsML.set(keyML, [...(bundleGroupsML.get(keyML) ?? []), entryML.booking]);
        titlesML.set(keyML, entryML.productTitle);
      } else {
        singlesML.push(entryML);
      }
    }

    await Promise.all([
      ...[...bundleGroupsML.entries()].map(([productIdML, bookingsML]) =>
        sendBundleBookingConfirmationML(bookingsML, titlesML.get(productIdML) ?? "", shopML),
      ),
      ...singlesML.map((entryML) =>
        sendBookingConfirmationML(entryML.booking, entryML.productTitle, shopML),
      ),
    ]);
  })().catch((errorML) => {
    console.error("Failed to send manual booking emails:", errorML);
  });
}

export async function createManualBookingML(
  shopML: string,
  inputML: ManualBookingInput,
): Promise<ManualBookingResult> {
  const bookableProductML = await prismaML.bookableProduct.findFirst({
    where: { id: inputML.bookableProductId, shop: shopML },
  });
  if (!bookableProductML || !bookableProductML.isEnabled) {
    return { ok: false, error: "This product isn't enabled for booking." };
  }

  const resolvedLocationML = inputML.locationId
    ? await getLocationByIdML(shopML, inputML.locationId)
    : null;

  const shopSettingsML = await getBookingSettingsML(shopML);
  const effectiveSettingsML = resolveEffectiveSettingsML(
    shopSettingsML,
    bookableProductML,
    resolvedLocationML,
  );
  const quantityML =
    Number.isInteger(inputML.quantity) && (inputML.quantity as number) > 0
      ? (inputML.quantity as number)
      : 1;

  const customFieldsML = await listCustomFieldsML(shopML);
  const responsesML = inputML.customFieldResponses ?? {};
  for (const fieldML of customFieldsML) {
    if (fieldML.required && !responsesML[fieldML.fieldKey]?.trim()) {
      return { ok: false, error: `"${fieldML.label}" is required.` };
    }
  }

  let slotStartsAtML: Date;
  let slotEndML: string;
  let bookingEndDateFieldML: string | null = null;

  if (bookableProductML.bookingType === "FULL_DAY") {
    slotStartsAtML = new Date(`${inputML.date}T00:00:00.000Z`);
    slotEndML = effectiveSettingsML.dailyEndTime;
    const alreadyBookedML = await countConfirmedBookingsForSlotML(
      shopML,
      bookableProductML.id,
      slotStartsAtML,
      resolvedLocationML?.id,
    );
    if (alreadyBookedML + quantityML > effectiveSettingsML.maxBookingsPerSlot) {
      return { ok: false, error: "That day is already fully booked." };
    }
  } else if (bookableProductML.bookingType === "MULTI_DAY") {
    if (!inputML.endDate) {
      return { ok: false, error: "Pick a check-out date." };
    }
    if (inputML.endDate <= inputML.date) {
      return { ok: false, error: "Check-out must be after check-in." };
    }
    const nightsML = Math.round(
      (new Date(`${inputML.endDate}T00:00:00.000Z`).getTime() -
        new Date(`${inputML.date}T00:00:00.000Z`).getTime()) /
        86400000,
    );
    if (bookableProductML.minNights !== null && nightsML < bookableProductML.minNights) {
      return {
        ok: false,
        error: `Minimum stay is ${bookableProductML.minNights} night${bookableProductML.minNights === 1 ? "" : "s"}.`,
      };
    }
    if (bookableProductML.maxNights !== null && nightsML > bookableProductML.maxNights) {
      return {
        ok: false,
        error: `Maximum stay is ${bookableProductML.maxNights} night${bookableProductML.maxNights === 1 ? "" : "s"}.`,
      };
    }
    bookingEndDateFieldML = inputML.endDate;
    slotStartsAtML = new Date(`${inputML.date}T00:00:00.000Z`);
    slotEndML = "00:00";
    const alreadyBookedML = await countOverlappingMultiDayBookingsML(
      shopML,
      bookableProductML.id,
      inputML.date,
      inputML.endDate,
      { locationId: resolvedLocationML?.id },
    );
    if (alreadyBookedML + quantityML > effectiveSettingsML.maxBookingsPerSlot) {
      return { ok: false, error: "Those dates overlap an existing booking." };
    }
  } else {
    const slotsForDateML = computeSlotsForDateML(
      effectiveSettingsML,
      inputML.date,
      new Set(),
      new Date(),
      new Map(),
      resolvedLocationML?.timezone ?? null,
    );
    const matchedSlotML = slotsForDateML.find((sML) => sML.start === inputML.slotStart);
    if (!matchedSlotML) {
      return {
        ok: false,
        error: "That date/time isn't a valid slot for this product.",
      };
    }
    slotStartsAtML = new Date(matchedSlotML.startsAt);
    slotEndML = matchedSlotML.end;
    const alreadyBookedML = await countConfirmedBookingsForSlotML(
      shopML,
      bookableProductML.id,
      slotStartsAtML,
      resolvedLocationML?.id,
    );
    if (alreadyBookedML + quantityML > effectiveSettingsML.maxBookingsPerSlot) {
      return { ok: false, error: "That slot is already fully booked." };
    }
  }

  const bookingML = await prismaML.booking.create({
    data: {
      shop: shopML,
      bookableProductId: bookableProductML.id,
      customerName: inputML.customerName,
      customerEmail: inputML.customerEmail,
      customerPhone: inputML.customerPhone,
      isGuest: true,
      location: inputML.location || null,
      locationId: resolvedLocationML?.id ?? null,
      date: inputML.date,
      endDate: bookingEndDateFieldML,
      slotStart: bookableProductML.bookingType === "FULL_DAY" ? effectiveSettingsML.dailyStartTime : inputML.slotStart,
      slotEnd: slotEndML,
      slotStartsAt: slotStartsAtML,
      quantity: quantityML,
      status: "CONFIRMED",
      source: "ADMIN_MANUAL",
      groupId: inputML.groupId,
      customFieldResponses:
        Object.keys(responsesML).length > 0 ? responsesML : undefined,
    },
  });

  return {
    ok: true,
    booking: bookingML,
    productTitle: bookableProductML.productTitle,
    bookingType: bookableProductML.bookingType,
  };
}

export type BookingWithProductTitle = Booking & {
  productTitle: string;
  bookingType: BookingType;
  displayStatus: string;
  locationTimezone: string | null;
};

export type ListBookingsFilters = {
  status?: "CONFIRMED" | "OVERBOOKED" | "CANCELLED" | "RESCHEDULED";
  bookableProductId?: string;
  bookingType?: BookingType;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  completed?: boolean;
};

export async function listBookingsML(
  shopML: string,
  filtersML: ListBookingsFilters = {},
): Promise<BookingWithProductTitle[]> {
  const bookingsML = await prismaML.booking.findMany({
    where: {
      shop: shopML,
      status: filtersML.status,
      bookableProductId: filtersML.bookableProductId,
      date: {
        gte: filtersML.dateFrom || undefined,
        lte: filtersML.dateTo || undefined,
      },
      ...(filtersML.bookingType
        ? { bookableProduct: { bookingType: filtersML.bookingType } }
        : {}),
      ...(filtersML.search
        ? {
            OR: [
              {
                customerName: { contains: filtersML.search, mode: "insensitive" },
              },
              {
                customerEmail: {
                  contains: filtersML.search,
                  mode: "insensitive",
                },
              },
              { orderName: { contains: filtersML.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      bookableProduct: { select: { productTitle: true, bookingType: true } },
      bookingLocation: { select: { timezone: true } },
    },
    orderBy: { slotStartsAt: "asc" },
    take: 100,
  });

  const withDisplayStatusML = bookingsML
    .map(
      ({
        bookableProduct: bookableProductML,
        bookingLocation: bookingLocationML,
        ...bookingML
      }: Booking & {
        bookableProduct: { productTitle: string; bookingType: BookingType };
        bookingLocation: { timezone: string } | null;
      }) => {
        const withTypeML = {
          ...bookingML,
          productTitle: bookableProductML.productTitle,
          bookingType: bookableProductML.bookingType,
          locationTimezone: bookingLocationML?.timezone ?? null,
        };
        return { ...withTypeML, displayStatus: getDisplayStatusML(withTypeML) };
      },
    )
    .sort((aML, bML) => {
      const aCancelledML = aML.status === "CANCELLED" ? 1 : 0;
      const bCancelledML = bML.status === "CANCELLED" ? 1 : 0;
      return aCancelledML - bCancelledML;
    });

  if (filtersML.completed === true) {
    return withDisplayStatusML.filter((bML) => belongsInCompletedTabML(bML));
  }
  if (filtersML.completed === false) {
    return withDisplayStatusML.filter((bML) => !belongsInCompletedTabML(bML));
  }
  return withDisplayStatusML;
}

export type CountBookingsFilters = {
  status?: "CONFIRMED" | "OVERBOOKED" | "CANCELLED" | "RESCHEDULED";
  dateFrom?: string;
  dateTo?: string;
};

export async function countBookingsML(
  shopML: string,
  filtersML: CountBookingsFilters = {},
): Promise<number> {
  return prismaML.booking.count({
    where: {
      shop: shopML,
      status: filtersML.status,
      date: {
        gte: filtersML.dateFrom || undefined,
        lte: filtersML.dateTo || undefined,
      },
    },
  });
}

export async function cancelBookingML(
  shopML: string,
  idML: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const bookingML = await prismaML.booking.findFirst({
    where: { id: idML, shop: shopML },
    include: { bookableProduct: { select: { productTitle: true } } },
  });
  if (!bookingML) {
    return { ok: false, error: "Booking not found." };
  }
  if (bookingML.status !== "CANCELLED") {
    await prismaML.booking.update({
      where: { id: idML },
      data: { status: "CANCELLED" },
    });
    await sendBookingCancellationML(
      bookingML,
      bookingML.bookableProduct.productTitle,
      shopML,
    );
  }
  return { ok: true };
}

export async function rescheduleBookingML(
  shopML: string,
  idML: string,
  newDateML: string,
  newSlotStartML: string,
  newEndDateML?: string | null,
): Promise<{ ok: true; booking: Booking } | { ok: false; error: string }> {
  const bookingML = await prismaML.booking.findFirst({
    where: { id: idML, shop: shopML },
    include: { bookableProduct: true },
  });
  if (!bookingML) {
    return { ok: false, error: "Booking not found." };
  }
  if (bookingML.status === "CANCELLED") {
    return { ok: false, error: "A cancelled booking can't be rescheduled." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDateML)) {
    return { ok: false, error: "Pick a valid date." };
  }

  const bookingTypeML = bookingML.bookableProduct.bookingType;
  const shopSettingsML = await getBookingSettingsML(shopML);
  const rescheduleLocationML = bookingML.locationId
    ? await getLocationByIdML(shopML, bookingML.locationId)
    : null;
  const effectiveSettingsML = resolveEffectiveSettingsML(
    shopSettingsML,
    bookingML.bookableProduct,
    rescheduleLocationML,
  );

  let nextDataML: {
    date: string;
    endDate?: string | null;
    slotStart?: string;
    slotEnd?: string;
    slotStartsAt: Date;
  };

  if (bookingTypeML === "FULL_DAY") {
    if (newDateML < new Date().toISOString().slice(0, 10)) {
      return { ok: false, error: "Pick a date that isn't in the past." };
    }
    const slotStartsAtML = new Date(`${newDateML}T00:00:00.000Z`);
    const othersML = await prismaML.booking.aggregate({
      where: {
        shop: shopML,
        bookableProductId: bookingML.bookableProductId,
        slotStartsAt: slotStartsAtML,
        status: { in: [...ACTIVE_BOOKING_STATUSES_ML] },
        id: { not: idML },
        ...locationCapacityScopeML(bookingML.locationId),
      },
      _sum: { quantity: true },
    });
    if (
      (othersML._sum.quantity ?? 0) + bookingML.quantity >
      effectiveSettingsML.maxBookingsPerSlot
    ) {
      return { ok: false, error: "That day is already fully booked." };
    }
    nextDataML = { date: newDateML, slotStartsAt: slotStartsAtML };
  } else if (bookingTypeML === "MULTI_DAY") {
    if (!newEndDateML) {
      return { ok: false, error: "Pick a check-out date." };
    }
    if (newEndDateML <= newDateML) {
      return { ok: false, error: "Check-out must be after check-in." };
    }
    if (newDateML < new Date().toISOString().slice(0, 10)) {
      return { ok: false, error: "Pick a check-in date that isn't in the past." };
    }
    const nightsML = Math.round(
      (new Date(`${newEndDateML}T00:00:00.000Z`).getTime() -
        new Date(`${newDateML}T00:00:00.000Z`).getTime()) /
        86400000,
    );
    const { minNights: minNightsML, maxNights: maxNightsML } = bookingML.bookableProduct;
    if (minNightsML !== null && nightsML < minNightsML) {
      return {
        ok: false,
        error: `Minimum stay is ${minNightsML} night${minNightsML === 1 ? "" : "s"}.`,
      };
    }
    if (maxNightsML !== null && nightsML > maxNightsML) {
      return {
        ok: false,
        error: `Maximum stay is ${maxNightsML} night${maxNightsML === 1 ? "" : "s"}.`,
      };
    }
    const overlappingML = await countOverlappingMultiDayBookingsML(
      shopML,
      bookingML.bookableProductId,
      newDateML,
      newEndDateML,
      { excludeBookingId: idML, locationId: bookingML.locationId },
    );
    if (overlappingML + bookingML.quantity > effectiveSettingsML.maxBookingsPerSlot) {
      return { ok: false, error: "Those dates overlap an existing booking." };
    }
    nextDataML = {
      date: newDateML,
      endDate: newEndDateML,
      slotStartsAt: new Date(`${newDateML}T00:00:00.000Z`),
    };
  } else {
    const slotsForDateML = computeSlotsForDateML(
      effectiveSettingsML,
      newDateML,
      new Set(),
      new Date(),
      new Map(),
      rescheduleLocationML?.timezone ?? null,
    );
    const matchedSlotML = slotsForDateML.find((sML) => sML.start === newSlotStartML);
    if (!matchedSlotML) {
      return {
        ok: false,
        error: "That date/time isn't a valid slot for this product.",
      };
    }

    const otherBookingsInSlotML = await prismaML.booking.aggregate({
      where: {
        shop: shopML,
        bookableProductId: bookingML.bookableProductId,
        slotStartsAt: new Date(matchedSlotML.startsAt),
        status: { in: [...ACTIVE_BOOKING_STATUSES_ML] },
        id: { not: idML },
        ...locationCapacityScopeML(bookingML.locationId),
      },
      _sum: { quantity: true },
    });
    if (
      (otherBookingsInSlotML._sum.quantity ?? 0) + bookingML.quantity >
      effectiveSettingsML.maxBookingsPerSlot
    ) {
      return { ok: false, error: "That slot is already fully booked." };
    }

    const validityDaysML = bookingML.bookableProduct.bundleValidityDays;
    if (bookingTypeML === "BUNDLE" && validityDaysML != null && bookingML.groupId) {
      const siblingsML = await prismaML.booking.findMany({
        where: {
          shop: shopML,
          groupId: bookingML.groupId,
          status: { not: "CANCELLED" },
          id: { not: idML },
        },
        select: { date: true },
      });
      const datesML = [...siblingsML.map((bML) => bML.date), newDateML].sort();
      const spanDaysML = Math.round(
        (new Date(`${datesML[datesML.length - 1]}T00:00:00.000Z`).getTime() -
          new Date(`${datesML[0]}T00:00:00.000Z`).getTime()) /
          86400000,
      );
      if (spanDaysML > validityDaysML) {
        return {
          ok: false,
          error: `All sessions must fall within ${validityDaysML} days of the first session.`,
        };
      }
    }

    nextDataML = {
      date: newDateML,
      slotStart: matchedSlotML.start,
      slotEnd: matchedSlotML.end,
      slotStartsAt: new Date(matchedSlotML.startsAt),
    };
  }

  const previousDateML = bookingML.date;
  const previousSlotStartML = bookingML.slotStart;
  const previousSlotEndML = bookingML.slotEnd;

  const updatedML = await prismaML.booking.update({
    where: { id: idML },
    data: {
      ...nextDataML,
      status: "RESCHEDULED",
      reminderSentAt: null,
    },
  });

  void sendBookingRescheduledML(
    updatedML,
    bookingML.bookableProduct.productTitle,
    shopML,
    previousDateML,
    previousSlotStartML,
    previousSlotEndML,
  ).catch((errorML) => console.error("Failed to send reschedule email:", errorML));

  return { ok: true, booking: updatedML };
}

export async function listSlotsForRescheduleML(
  shopML: string,
  bookingIdML: string,
  dateML: string,
): Promise
  | { ok: true; slots: import("./slotAvailability.server").TimeSlot[] }
  | { ok: false; error: string }
  {
  const bookingML = await prismaML.booking.findFirst({
    where: { id: bookingIdML, shop: shopML },
    include: { bookableProduct: true },
  });
  if (!bookingML) {
    return { ok: false, error: "Booking not found." };
  }

  const shopSettingsML = await getBookingSettingsML(shopML);
  const rescheduleLocationML = bookingML.locationId
    ? await getLocationByIdML(shopML, bookingML.locationId)
    : null;
  const effectiveSettingsML = resolveEffectiveSettingsML(
    shopSettingsML,
    bookingML.bookableProduct,
    rescheduleLocationML,
  );

  const { start: dayStartML, end: dayEndML } = localDayRangeUtcML(
    dateML,
    rescheduleLocationML?.timezone ?? null,
  );
  const groupedML = await prismaML.booking.groupBy({
    by: ["slotStartsAt"],
    where: {
      shop: shopML,
      bookableProductId: bookingML.bookableProductId,
      status: { in: [...ACTIVE_BOOKING_STATUSES_ML] },
      slotStartsAt: { gte: dayStartML, lte: dayEndML },
      id: { not: bookingIdML },
      ...locationCapacityScopeML(bookingML.locationId),
    },
    _sum: { quantity: true },
  });
  const bookedCountsML = new Map<string, number>();
  for (const rowML of groupedML) {
    bookedCountsML.set(rowML.slotStartsAt.toISOString(), rowML._sum.quantity ?? 0);
  }

  const slotsML = computeSlotsForDateML(
    effectiveSettingsML,
    dateML,
    new Set(),
    new Date(),
    bookedCountsML,
    rescheduleLocationML?.timezone ?? null,
  );

  return { ok: true, slots: slotsML };
}

const REMINDER_MIN_GAP_MS_ML = 6 * 60 * 60 * 1000;

const MAX_START_SKEW_BEFORE_MS_ML = 36 * 60 * 60 * 1000;
const MAX_START_SKEW_AFTER_MS_ML = 14 * 60 * 60 * 1000;

type ReminderCandidate = Booking & {
  bookableProduct: { productTitle: string; bookingType: BookingType };
  bookingLocation: { timezone: string } | null;
};

function bookingStartInstantML(bookingML: ReminderCandidate): Date {
  const typeML = bookingML.bookableProduct.bookingType;
  if (typeML !== "FULL_DAY" && typeML !== "MULTI_DAY") return bookingML.slotStartsAt;
  const timeML = /^\d{2}:\d{2}$/.test(bookingML.slotStart) ? bookingML.slotStart : "00:00";
  return zonedTimeToUtcML(
    bookingML.date,
    timeML,
    bookingML.bookingLocation?.timezone ?? null,
  );
}

function lastCustomerNoticeAtML(bookingML: ReminderCandidate): Date {
  return new Date(
    Math.max(
      bookingML.createdAt.getTime(),
      bookingML.confirmationSentAt?.getTime() ?? 0,
    ),
  );
}

export async function sendDueRemindersML(
  windowHoursML = 24,
): Promise<{ sent: number; skipped: number }> {
  const nowML = new Date();
  const windowMsML = windowHoursML * 60 * 60 * 1000;
  const windowEndML = new Date(nowML.getTime() + windowMsML);

  const candidatesML: ReminderCandidate[] = await prismaML.booking.findMany({
    where: {
      status: { in: [...ACTIVE_BOOKING_STATUSES_ML] },
      reminderSentAt: null,
      slotStartsAt: {
        gte: new Date(nowML.getTime() - MAX_START_SKEW_BEFORE_MS_ML),
        lte: new Date(windowEndML.getTime() + MAX_START_SKEW_AFTER_MS_ML),
      },
    },
    include: {
      bookableProduct: { select: { productTitle: true, bookingType: true } },
      bookingLocation: { select: { timezone: true } },
    },
  });

  let sentML = 0;
  let skippedML = 0;

  for (const bookingML of candidatesML) {
    const startsAtML = bookingStartInstantML(bookingML);
    if (startsAtML < nowML || startsAtML > windowEndML) continue;

    if (!bookingML.customerEmail) {
      skippedML += 1;
      continue;
    }

    const noticeAtML = lastCustomerNoticeAtML(bookingML);
    if (startsAtML.getTime() - noticeAtML.getTime() < windowMsML) {
      skippedML += 1;
      continue;
    }
    if (nowML.getTime() - noticeAtML.getTime() < REMINDER_MIN_GAP_MS_ML) continue;

    const { fromName: fromNameML } = await getShopEmailSettingsML(bookingML.shop);
    const { subject: subjectML, text: textML, html: htmlML } = await reminderEmailML(bookingML.shop, {
      productTitle: bookingML.bookableProduct.productTitle,
      customerName: bookingML.customerName,
      date: formatDateDisplayML(bookingML.date),
      slotStart: bookingML.slotStart,
      slotEnd: bookingML.slotEnd,
      shopName: bookingML.shop,
    });

    const okML = await sendEmailML({
      shop: bookingML.shop,
      to: bookingML.customerEmail,
      subject: subjectML,
      text: textML,
      html: htmlML,
      fromName: fromNameML,
    });
    if (okML) {
      await prismaML.booking.update({
        where: { id: bookingML.id },
        data: { reminderSentAt: new Date() },
      });
      sentML += 1;
    } else {
      skippedML += 1;
    }
  }

  return { sent: sentML, skipped: skippedML };
}