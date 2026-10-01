import { sendDueRemindersML } from "../models/booking.server";

const CHECK_EVERY_MS_ML = 5 * 60 * 1000;
const FIRST_CHECK_DELAY_MS_ML = 30 * 1000;

declare global {
  var reminderTimerStartedML: boolean | undefined;
}

export function startReminderSchedulerML(): void {
  if (globalThis.reminderTimerStartedML) return;
  if (process.env.DISABLE_REMINDER_TIMER === "true") return;
  globalThis.reminderTimerStartedML = true;

  let runningML = false;

  const runML = async () => {
    if (runningML) return;
    runningML = true;
    try {
      await sendDueRemindersML();
    } catch (errorML) {
      console.error("Reminder check failed:", errorML);
    } finally {
      runningML = false;
    }
  };

  setTimeout(runML, FIRST_CHECK_DELAY_MS_ML).unref();
  setInterval(runML, CHECK_EVERY_MS_ML).unref();
}
