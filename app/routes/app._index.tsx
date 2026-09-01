import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { listBookableProducts } from "../models/bookableProduct.server";
import { countBookings } from "../models/booking.server";
import { getSmtpSettings } from "../models/smtpSettings.server";
import { listEnabledLocations, maybePrefillFirstLocationFromShopTimezone } from "../models/bookingLocation.server";

const DIVIDER = "#E1E1E1";
const TEXT_BLACK = "#1A1A1A";
const TEXT_MUTED = "#6B6B6B";

const guideStyles: Record<string, React.CSSProperties> = {
  card: {
    background: "#FFFFFF",
    border: "1px solid #E5E5E5",
    borderRadius: "8px",
    padding: "16px",
  },
  sectionHeading: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 700,
    fontSize: "18px",
    lineHeight: "22px",
    color: TEXT_BLACK,
    margin: "0 0 4px",
  },
  intro: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "20px",
    color: TEXT_MUTED,
    margin: "0 0 16px",
  },
  divider: {
    border: "none",
    borderTop: `1px solid ${DIVIDER}`,
    margin: "20px 0",
    width: "100%",
  },
  stepTitle: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 700,
    fontSize: "16px",
    lineHeight: "20px",
    color: TEXT_BLACK,
    margin: 0,
  },
  stepDescription: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "20px",
    color: TEXT_MUTED,
    margin: "6px 0 16px",
  },
  stepButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 18px",
    background: "#000000",
    borderRadius: "8px",
    color: "#FFFFFF",
    fontFamily: "Inter, sans-serif",
    fontWeight: 700,
    fontSize: "15px",
    lineHeight: "19px",
    border: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
    textDecoration: "none",
  },
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function endOfWeekISO(): string {
  const end = new Date();
  end.setDate(end.getDate() + 7);
  return end.toISOString().slice(0, 10);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const today = todayISO();
  const weekEnd = endOfWeekISO();

  const [, products, todayCount, weekCount, overbookedCount, smtpSettings, enabledLocations] =
    await Promise.all([
      maybePrefillFirstLocationFromShopTimezone(session.shop, admin),
      listBookableProducts(session.shop),
      countBookings(session.shop, { dateFrom: today, dateTo: today }),
      countBookings(session.shop, { dateFrom: today, dateTo: weekEnd }),
      countBookings(session.shop, { status: "OVERBOOKED" }),
      getSmtpSettings(session.shop),
      listEnabledLocations(session.shop),
    ]);

  const enabledProductCount = products.filter((p) => p.isEnabled).length;
  const smtpConfigured = Boolean(
    smtpSettings?.host &&
      smtpSettings.port &&
      smtpSettings.username &&
      smtpSettings.password &&
      smtpSettings.fromEmail,
  );

  return {
    stats: { todayCount, weekCount, overbookedCount, enabledProductCount },
    smtpConfigured,
    hasLocations: enabledLocations.length > 0,
  };
};

export default function Dashboard() {
  const { stats, smtpConfigured, hasLocations } = useLoaderData<typeof loader>();

  const setupSteps = [
    {
      done: hasLocations,
      label: "Add at least one location so booking times use the right timezone",
      href: "/app/booking-settings/locations",
      cta: "Go to Locations",
    },
    {
      done: stats.enabledProductCount > 0,
      label: "Enable at least one product for booking",
      href: "/app/products",
      cta: "Go to Products",
    },
    {
      done: smtpConfigured,
      label: "Configure SMTP so booking emails can send",
      href: "/app/settings",
      cta: "Go to Settings",
    },
  ];
  const remainingSteps = setupSteps.filter((s) => !s.done);

  return (
    <s-page heading="Dashboard">
      {stats.overbookedCount > 0 && (
        <s-banner tone="critical" heading="Bookings need review">
          <s-paragraph>
            {stats.overbookedCount === 1
              ? "1 booking landed in an already-full slot and needs a look."
              : `${stats.overbookedCount} bookings landed in already-full slots and need a look.`}
          </s-paragraph>
          <s-link href="/app/bookings?status=OVERBOOKED">
            Review overbooked bookings
          </s-link>
        </s-banner>
      )}

      {remainingSteps.length > 0 && (
        <s-section heading="Get set up">
          <s-stack direction="block" gap="base">
            {remainingSteps.map((step) => (
              <s-stack
                key={step.label}
                direction="inline"
                gap="base"
                alignItems="center"
              >
                <s-paragraph>{step.label}</s-paragraph>
                <s-link href={step.href}>{step.cta}</s-link>
              </s-stack>
            ))}
          </s-stack>
        </s-section>
      )}

      <div style={guideStyles.card}>
        <h2 style={guideStyles.sectionHeading}>App guide</h2>
        <p style={guideStyles.intro}>
          A quick walkthrough of how to get bookings running end to end.
        </p>
        <hr style={guideStyles.divider} />
        {[
            {
              title: "Enable booking on your products",
              body: "Go to Products and turn on booking for each product customers should be able to book. You can override the shop's default schedule per product if needed.",
              cta: "Go to Products",
              href: "/app/products",
            },
            {
              title: "Set your booking schedule",
              body: "In Booking Settings, choose working days, daily hours, slot duration, buffer time between slots, how far in advance customers can book, and how many bookings are allowed per slot.",
              cta: "Go to Booking Settings",
              href: "/app/booking-settings",
            },
            {
              title: "Block off days you're unavailable",
              body: "Add holidays or one-off closures on the Blackout Dates tab, shop-wide or for a specific product.",
              cta: "Go to Blackout Dates",
              href: "/app/booking-settings/blackout-dates",
            },
            {
              title: "Collect extra info at booking time (optional)",
              body: "Add fields like notes, preferences, or special requests on the Custom Fields tab. Customers fill these in when booking, and you'll see their answers on each booking.",
              cta: "Go to Custom Fields",
              href: "/app/booking-settings/custom-fields",
            },
            {
              title: "Turn on the booking widget",
              body: "In Booking Settings, use the \"Open theme editor → App embeds\" link and switch the EasyBooking app embed on. It shows up automatically on every bookable product page — no manual placement needed.",
              cta: "Go to Booking Settings",
              href: "/app/booking-settings",
            },
            {
              title: "Turn on booking emails",
              body: "Configure SMTP in Settings → SMTP Settings so customers automatically get confirmation, reminder, and cancellation emails.",
              cta: "Go to Settings",
              href: "/app/settings",
            },
            {
              title: "Manage bookings as they come in",
              body: "View, search, reschedule, or cancel bookings from Bookings. You can also add bookings manually from the New Booking tab there. If two customers ever land in the same slot, it's flagged as Overbooked so you can review and resolve it — you'll see a banner for that at the top of this page when it happens.",
              cta: "Go to Bookings",
              href: "/app/bookings",
            },
          ].map((step, index, all) => (
            <div key={step.title}>
              <h3 style={guideStyles.stepTitle}>
                {index + 1}. {step.title}
              </h3>
              <p style={guideStyles.stepDescription}>{step.body}</p>
              <a href={step.href} style={guideStyles.stepButton}>
                {step.cta}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 3.5L10.5 8L6 12.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              {index < all.length - 1 && <hr style={guideStyles.divider} />}
            </div>
          ))}
        </div>

      <s-section heading="At a glance">
        <s-stack direction="inline" gap="loose">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="none">
              <s-heading>{stats.todayCount}</s-heading>
              <s-text tone="subdued">Bookings today</s-text>
            </s-stack>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="none">
              <s-heading>{stats.weekCount}</s-heading>
              <s-text tone="subdued">Bookings this week</s-text>
            </s-stack>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="none">
              <s-heading>{stats.enabledProductCount}</s-heading>
              <s-text tone="subdued">Products enabled for booking</s-text>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};