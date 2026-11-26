// When a visitor should check back after asking Molly (task-molly concierge, /premium).

/** Minutes until Molly sends an estimate after someone asks. */
export const ESTIMATE_MINUTES = 30;

/**
 * The time to check back: the moment they asked Molly plus ESTIMATE_MINUTES, shown in Kenya
 * time (Africa/Nairobi, EAT) whatever the visitor's device is set to, e.g. "5:53 PM".
 */
export function checkBackTime(askedAt: Date, minutes: number = ESTIMATE_MINUTES): string {
  const due = new Date(askedAt.getTime() + minutes * 60_000);
  // Read the hour and minute in Kenya time, then write "h:mm AM/PM" ourselves, so the result
  // doesn't depend on how a browser or Node version formats Kenyan times (some give "0:15 am").
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(due);
  const hour24 = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minute} ${hour24 < 12 ? 'AM' : 'PM'}`;
}
