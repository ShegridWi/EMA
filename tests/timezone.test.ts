import { describe, it, expect } from "vitest";
import { zonedTimeToUtc, formatInTimezone } from "@/lib/timezone";

// Pure functions, no DB involved — this is the trickiest math in the
// phase 9 timezone refactor (05-nextjs-conventions.md "Timezone
// handling"), so it gets its own direct coverage rather than relying on
// indirect exercise through Sales/Reports/MovementLog.

describe("zonedTimeToUtc", () => {
  it("converts midnight in a fixed UTC-4 zone (America/La_Paz) to 04:00 UTC", () => {
    const result = zonedTimeToUtc("2026-01-07", "America/La_Paz");
    expect(result.toISOString()).toBe("2026-01-07T04:00:00.000Z");
  });

  it("converts end-of-day (23:59:59.999) in America/La_Paz to 03:59:59.999 UTC the next day", () => {
    const result = zonedTimeToUtc("2026-01-07", "America/La_Paz", {
      hour: 23,
      minute: 59,
      second: 59,
      millisecond: 999,
    });
    expect(result.toISOString()).toBe("2026-01-08T03:59:59.999Z");
  });

  it("converts midnight in a fixed UTC+9 zone (Asia/Tokyo) to the previous day 15:00 UTC", () => {
    const result = zonedTimeToUtc("2026-01-07", "Asia/Tokyo");
    expect(result.toISOString()).toBe("2026-01-06T15:00:00.000Z");
  });

  it("round-trips through a DST-observing zone (America/New_York) without throwing and stays within a day of the input", () => {
    const result = zonedTimeToUtc("2026-07-15", "America/New_York");
    // Just a sanity bound — EDT is UTC-4 in July, so this should land on
    // the 15th at 04:00 UTC; the real assertion is that DST doesn't
    // crash or wildly misfire the general-purpose offset math.
    expect(result.toISOString()).toBe("2026-07-15T04:00:00.000Z");
  });

  it("returns an Invalid Date instead of throwing for a malformed string", () => {
    // Regression test: Intl.DateTimeFormat.formatToParts throws on an
    // Invalid Date, so a naive implementation would crash here instead
    // of failing gracefully like the native Date constructor does.
    expect(() => zonedTimeToUtc("not-a-date", "America/La_Paz")).not.toThrow();
    expect(Number.isNaN(zonedTimeToUtc("not-a-date", "America/La_Paz").getTime())).toBe(true);
  });

  it("returns an Invalid Date for a numerically-plausible but nonexistent calendar date", () => {
    expect(Number.isNaN(zonedTimeToUtc("2026-02-30", "America/La_Paz").getTime())).toBe(true);
    expect(Number.isNaN(zonedTimeToUtc("2026-13-01", "America/La_Paz").getTime())).toBe(true);
  });
});

describe("formatInTimezone", () => {
  const instant = new Date("2026-01-07T04:00:00.000Z");

  it("formats a UTC instant as local midnight in America/La_Paz", () => {
    const formatted = formatInTimezone(instant, "America/La_Paz", "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    expect(formatted).toBe("00:00");
  });

  it("formats the same instant differently in a different zone (Asia/Tokyo)", () => {
    const formatted = formatInTimezone(instant, "Asia/Tokyo", "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    expect(formatted).toBe("13:00");
  });
});
