// Timezone conversion without adding a dependency (no date-fns-tz /
// luxon — CLAUDE.md section 1, avoid dependencies that aren't earning
// their keep). See 05-nextjs-conventions.md "Timezone handling" for the
// full rationale.
//
// Rule: every DateTime column stays in UTC (Postgres/Prisma default).
// Conversion only happens at the two human-facing boundaries:
//   - parsing a date-only form input (zonedTimeToUtc)
//   - displaying a stored UTC instant (formatInTimezone)
// Always use the acting/viewing user's configured timezone
// (UserSettings.timezone, phase 9a) — never assume everyone is on the
// default, even though in practice almost everyone will be
// (America/La_Paz, fixed UTC-4, no DST).

// For a given UTC instant, how many minutes ahead of UTC `timeZone` is
// at that moment (positive = ahead, e.g. UTC+2; negative = behind, e.g.
// America/La_Paz's fixed -240). Works for any IANA zone, DST-observing
// or not, by asking Intl what the wall-clock reading in that zone would
// be and comparing it back against the UTC instant.
function getOffsetMinutesAt(instant: Date, timeZone: string): number {
  // Timezone offsets are always whole minutes, but `Intl.DateTimeFormat`
  // only reports whole seconds — round `instant` down to the second
  // first. Otherwise an instant with a millisecond component (e.g.
  // 23:59:59.999) leaks those milliseconds into the subtraction below
  // and produces a bogus near-a-second offset error.
  const truncated = new Date(Math.floor(instant.getTime() / 1000) * 1000);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(truncated)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  const wallClockAsIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return (wallClockAsIfUtc - truncated.getTime()) / 60_000;
}

export type WallClockTime = {
  hour?: number;
  minute?: number;
  second?: number;
  millisecond?: number;
};

/**
 * Interprets a `YYYY-MM-DD` date-only string (e.g. from
 * `<input type="date">`) as a specific wall-clock time *in `timeZone`*,
 * and returns the equivalent UTC `Date` for storage/filtering — this is
 * the direction with no built-in helper. Replaces ad hoc
 * `` `${value}T00:00:00` `` string concatenation, which silently assumes
 * the *server's* local timezone instead of the acting user's.
 */
export function zonedTimeToUtc(
  dateOnly: string,
  timeZone: string,
  time: WallClockTime = {},
): Date {
  // Returns an Invalid Date (matching `new Date("garbage")`'s own
  // ergonomics) instead of throwing for malformed input, so callers can
  // keep using a plain `Number.isNaN(result.getTime())` check — without
  // this, a bad "from"/"to" query param would otherwise crash later
  // inside Intl.DateTimeFormat.formatToParts (it throws on an invalid
  // Date) rather than failing cleanly.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!match) return new Date(NaN);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const { hour = 0, minute = 0, second = 0, millisecond = 0 } = time;

  // First guess treating the wall-clock values as UTC, then correct by
  // that instant's actual offset in `timeZone`.
  const utcGuess = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second, millisecond),
  );

  // `Date.UTC` silently rolls invalid components (e.g. month 13, day
  // 32) into a different, real date instead of erroring — reject that
  // rather than returning a silently-shifted date.
  if (
    utcGuess.getUTCFullYear() !== year ||
    utcGuess.getUTCMonth() !== month - 1 ||
    utcGuess.getUTCDate() !== day
  ) {
    return new Date(NaN);
  }

  const offsetMinutes = getOffsetMinutesAt(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMinutes * 60_000);
}

/**
 * The inverse direction of `zonedTimeToUtc`'s date-only input: returns
 * the `YYYY-MM-DD` calendar date that `instant` falls on *in
 * `timeZone`* — used wherever business logic needs "what day is it
 * right now" for a specific timezone rather than the server's own
 * (e.g. the weekly report's Monday–Saturday range, lib/reports.ts).
 */
export function getZonedDateOnly(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/**
 * Formats a stored UTC instant in `timeZone` — a thin wrapper around
 * `Intl.DateTimeFormat`, which already renders any IANA zone correctly.
 * Replaces bare `new Intl.DateTimeFormat(locale).format(date)` calls,
 * which format in the *server's* local timezone since no `timeZone`
 * option is passed.
 */
export function formatInTimezone(
  date: Date,
  timeZone: string,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(date);
}
