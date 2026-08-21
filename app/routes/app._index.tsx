import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { listBookableProducts } from "../models/bookableProduct.server";
import {
  countBookings,
  getUpcomingBookings,
} from "../models/booking.server";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function endOfWeekISO(): string {
  const end = new Date();
  end.setDate(end.getDate() + 7);
  return end.toISOString().slice(0, 10);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const today = todayISO();
  const weekEnd = endOfWeekISO();

  const [products, todayCount, weekCount, overbookedCount, upcoming] =
    await Promise.all([
      listBookableProducts(session.shop),
      countBookings(session.shop, { dateFrom: today, dateTo: today }),
      countBookings(session.shop, { dateFrom: today, dateTo: weekEnd }),
      countBookings(session.shop, { status: "OVERBOOKED" }),
      getUpcomingBookings(session.shop, 5),
    ]);

  const enabledProductCount = products.filter((p) => p.isEnabled).length;
  const smtpConfigured = Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD &&
      process.env.SMTP_FROM_EMAIL,
  );

  return {
    stats: { todayCount, weekCount, overbookedCount, enabledProductCount },
    smtpConfigured,
    upcoming,
  };
};

export default function Dashboard() {
  const { stats, smtpConfigured, upcoming } = useLoaderData<typeof loader>();

  const setupSteps = [
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

      <s-section heading="App guide">
        <s-paragraph>
          A quick walkthrough of how to get bookings running end to end.
        </s-paragraph>
        <s-ordered-list>
          <s-list-item>
            <s-text>
              <b>Enable booking on your products</b> — go to{" "}
              <s-link href="/app/products">Products</s-link> and turn on
              booking for each product customers should be able to book. You
              can override the shop's default schedule per product if needed.
            </s-text>
          </s-list-item>
          <s-list-item>
            <s-text>
              <b>Set your booking schedule</b> — in{" "}
              <s-link href="/app/settings">Booking Settings</s-link>, choose
              working days, daily hours, slot duration, buffer time between
              slots, how far in advance customers can book, and how many
              bookings are allowed per slot.
            </s-text>
          </s-list-item>
          <s-list-item>
            <s-text>
              <b>Block off days you're unavailable</b> — add holidays or
              one-off closures on the{" "}
              <s-link href="/app/settings/blackout-dates">Blackout Dates</s-link>{" "}
              tab, shop-wide or for a specific product.
            </s-text>
          </s-list-item>
          <s-list-item>
            <s-text>
              <b>Collect extra info at booking time (optional)</b> — add
              fields like notes, preferences, or special requests on the{" "}
              <s-link href="/app/settings/custom-fields">Custom Fields</s-link> tab.
              Customers fill these in when booking, and you'll see their
              answers on each booking.
            </s-text>
          </s-list-item>
          <s-list-item>
            <s-text>
              <b>Turn on the booking widget</b> — in{" "}
              <s-link href="/app/settings">Booking Settings</s-link>, use
              the "Open theme editor → App embeds" link and switch the
              EasyBooking app embed on. It shows up automatically on every
              bookable product page — no manual placement needed.
            </s-text>
          </s-list-item>
          <s-list-item>
            <s-text>
              <b>Turn on booking emails</b> — configure SMTP in{" "}
              <s-link href="/app/settings">Booking Settings</s-link> so
              customers automatically get confirmation, reminder, and
              cancellation emails.
            </s-text>
          </s-list-item>
          <s-list-item>
            <s-text>
              <b>Manage bookings as they come in</b> — view, search,
              reschedule, or cancel bookings from{" "}
              <s-link href="/app/bookings">
                Bookings
              </s-link>
              . You can also add bookings manually from the{" "}
              <s-link href="/app/bookings/new">New Booking</s-link> tab there. If two
              customers ever land in the same slot, it's flagged as{" "}
              <b>Overbooked</b> so you can review and resolve it — you'll
              see a banner for that at the top of this page when it happens.
            </s-text>
          </s-list-item>
        </s-ordered-list>
      </s-section>

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

      <s-section heading="Upcoming bookings">
        {upcoming.length === 0 ? (
          <s-paragraph>Nothing coming up yet.</s-paragraph>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>Product</s-table-header>
              <s-table-header>Customer</s-table-header>
              <s-table-header>When</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {upcoming.map((booking) => (
                <s-table-row key={booking.id}>
                  <s-table-cell>{booking.productTitle}</s-table-cell>
                  <s-table-cell>{booking.customerName ?? "—"}</s-table-cell>
                  <s-table-cell>
                    {booking.date} {booking.slotStart}–{booking.slotEnd}
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
        <s-link href="/app/bookings">View all bookings</s-link>
      </s-section>

      <s-section slot="aside" heading="Quick links">
        <s-stack direction="block" gap="small">
          <s-link href="/app/settings">Settings</s-link>
          <s-link href="/app/products">Products</s-link>
          <s-link href="/app/bookings">Bookings</s-link>
          <s-link href="/app/bookings/new">New Booking</s-link>
          <s-link href="/app/reports">Reports</s-link>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};