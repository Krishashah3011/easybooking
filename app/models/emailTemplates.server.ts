export type BookingEmailData = {
  productTitle: string;
  customerName: string | null;
  date: string; // "YYYY-MM-DD"
  slotStart: string; // "HH:mm"
  slotEnd: string; // "HH:mm"
  shopName: string;
};

function greeting(customerName: string | null): string {
  return customerName ? `Hi ${customerName},` : "Hi,";
}

export function confirmationEmail(data: BookingEmailData): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `Booking confirmed: ${data.productTitle} on ${data.date}`;
  const text = [
    greeting(data.customerName),
    "",
    `Your booking is confirmed:`,
    `- ${data.productTitle}`,
    `- ${data.date}, ${data.slotStart}\u2013${data.slotEnd}`,
    "",
    `Thanks for booking with ${data.shopName}.`,
  ].join("\n");

  const html = `
    <p>${greeting(data.customerName)}</p>
    <p>Your booking is confirmed:</p>
    <ul>
      <li><strong>${escapeHtml(data.productTitle)}</strong></li>
      <li>${escapeHtml(data.date)}, ${escapeHtml(data.slotStart)}\u2013${escapeHtml(data.slotEnd)}</li>
    </ul>
    <p>Thanks for booking with ${escapeHtml(data.shopName)}.</p>
  `.trim();

  return { subject, text, html };
}

export function reminderEmail(data: BookingEmailData): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `Reminder: ${data.productTitle} coming up on ${data.date}`;
  const text = [
    greeting(data.customerName),
    "",
    `This is a reminder for your upcoming booking:`,
    `- ${data.productTitle}`,
    `- ${data.date}, ${data.slotStart}\u2013${data.slotEnd}`,
    "",
    `See you soon \u2014 ${data.shopName}.`,
  ].join("\n");

  const html = `
    <p>${greeting(data.customerName)}</p>
    <p>This is a reminder for your upcoming booking:</p>
    <ul>
      <li><strong>${escapeHtml(data.productTitle)}</strong></li>
      <li>${escapeHtml(data.date)}, ${escapeHtml(data.slotStart)}\u2013${escapeHtml(data.slotEnd)}</li>
    </ul>
    <p>See you soon \u2014 ${escapeHtml(data.shopName)}.</p>
  `.trim();

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
