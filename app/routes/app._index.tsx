import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { listBookableProducts } from "../models/bookableProduct.server";
import { countBookings } from "../models/booking.server";
import { getSmtpSettings } from "../models/smtpSettings.server";
import { listEnabledLocations, maybePrefillFirstLocationFromShopTimezone } from "../models/bookingLocation.server";
import { getOrCreateShopSettings } from "../models/shopSettings.server";
import GetStartedGuide, { type GuideStep } from "../components/GetStartedGuide";

const DIVIDER = "#DBDBDB";
const TEXT_BLACK = "#000000";
const TEXT_MUTED = "#373737";

const guideStyles: Record<string, React.CSSProperties> = {
  card: {
    background: "#FFFFFF",
    border: "1px solid #E5E5E5",
    borderRadius: "8px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginBottom: "16px",
  },
  sectionHeading: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
    fontSize: "18px",
    lineHeight: "22px",
    letterSpacing: "0.02em",
    color: TEXT_BLACK,
    margin: 0,
  },
  intro: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "20px",
    color: TEXT_MUTED,
    margin: 0,
  },
  divider: {
    border: "none",
    borderTop: `1px solid ${DIVIDER}`,
    margin: 0,
    width: "100%",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
  },
  statCard: {
    background: "#FAFAFA",
    border: "1px solid #E5E5E5",
    borderRadius: "8px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  statValue: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 700,
    fontSize: "28px",
    lineHeight: "32px",
    color: TEXT_BLACK,
    margin: 0,
  },
  statLabel: {
    fontFamily: "Inter, sans-serif",
    fontWeight: 500,
    fontSize: "13px",
    lineHeight: "18px",
    color: TEXT_MUTED,
    margin: 0,
  },
};

const BOOKING_WIDGET_BLOCK_HANDLE = "booking-widget";

function buildGuideSteps(
  shop: string,
  apiKey: string,
  registered: boolean,
): GuideStep[] {
  const lockedSteps: GuideStep[] = [
    {
      title: "Turn on the booking widget",
      body: "Switch the EasyBooking app embed on in the theme editor. It shows up automatically on every bookable product page — no manual placement needed.",
      cta: "Activate App Embed",
      href: `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=${apiKey}/${BOOKING_WIDGET_BLOCK_HANDLE}`,
      external: true,
    },
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
  ].map((step) => ({ ...step, locked: !registered }));

  return [
    {
      title: "Create your account",
      body: "Register with your name and email to unlock the rest of EasyBooking. Every other page stays locked until this is done.",
      cta: "Register",
      href: "/app/account",
      done: registered,
    },
    ...lockedSteps,
  ];
}

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
  const shopSettings = await getOrCreateShopSettings(session.shop);
  const shared = {
    shop: session.shop,
    apiKey: process.env.SHOPIFY_API_KEY ?? "",
    registered: shopSettings.registered,
  };

  // Unregistered shops only see the user guide, so skip the rest of the
  // dashboard queries until they've registered.
  if (!shopSettings.registered) {
    return {
      stats: { todayCount: 0, weekCount: 0, overbookedCount: 0, enabledProductCount: 0 },
      smtpConfigured: false,
      hasLocations: false,
      ...shared,
    };
  }

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
    ...shared,
  };
};

export default function Dashboard() {
  const { stats, smtpConfigured, hasLocations, shop, apiKey, registered } =
    useLoaderData<typeof loader>();
  const guideSteps = buildGuideSteps(shop, apiKey, registered);

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
      {!registered && (
        <s-banner tone="info" heading="Register to unlock EasyBooking">
          <s-paragraph>
            Create your account with a name and email to unlock every page
            of the app. Until then, this dashboard only shows the user
            guide below.
          </s-paragraph>
          <s-link href="/app/account">Go to Account</s-link>
        </s-banner>
      )}

      {registered && (
        <>
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
        </>
      )}

      <GetStartedGuide
        appName="EasyBooking"
        intro="A quick walkthrough of how to get bookings running end to end."
        steps={guideSteps}
      />

      {registered && (
        <div style={guideStyles.card}>
          <h2 style={guideStyles.sectionHeading}>At a glance</h2>
          <p style={guideStyles.intro}>A quick snapshot of your booking activity.</p>
          <hr style={guideStyles.divider} />
          <div style={guideStyles.statsGrid}>
            <div style={guideStyles.statCard}>
              <p style={guideStyles.statValue}>{stats.todayCount}</p>
              <p style={guideStyles.statLabel}>Bookings today</p>
            </div>
            <div style={guideStyles.statCard}>
              <p style={guideStyles.statValue}>{stats.weekCount}</p>
              <p style={guideStyles.statLabel}>Bookings in the next 7 days</p>
            </div>
            <div style={guideStyles.statCard}>
              <p style={guideStyles.statValue}>{stats.enabledProductCount}</p>
              <p style={guideStyles.statLabel}>Products enabled for booking</p>
            </div>
          </div>
        </div>
      )}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};