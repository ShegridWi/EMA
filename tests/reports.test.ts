import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createSale } from "@/lib/inventory";
import { summarizeSales, getWeekRange, getReportData } from "@/lib/reports";
import { GET as weeklyReportCron } from "@/app/api/cron/weekly-report/route";

// Money-touching (sales totals) → tests required before merging
// (CLAUDE.md section 7), same reasoning as tests/sales.test.ts.

const TEST_TAG = "VITEST_REPORTS_";

describe("summarizeSales", () => {
  it("returns all-zero totals for an empty range", () => {
    expect(summarizeSales([])).toEqual({
      count: 0,
      totalRevenue: 0,
      totalAmountPaid: 0,
      totalBalanceDue: 0,
    });
  });

  it("sums totalPrice/amountPaid/balanceDue across multiple sales", () => {
    const result = summarizeSales([
      { totalPrice: 100, amountPaid: 100, balanceDue: 0 },
      { totalPrice: 50, amountPaid: 20, balanceDue: 30 },
      { totalPrice: 200, amountPaid: 0, balanceDue: 200 },
    ]);
    expect(result).toEqual({
      count: 3,
      totalRevenue: 350,
      totalAmountPaid: 120,
      totalBalanceDue: 230,
    });
  });

  it("rounds to 2 decimals without float drift", () => {
    const result = summarizeSales([
      { totalPrice: 99.99, amountPaid: 33.33, balanceDue: 66.66 },
      { totalPrice: 0.1, amountPaid: 0.1, balanceDue: 0 },
      { totalPrice: 0.2, amountPaid: 0.2, balanceDue: 0 },
    ]);
    expect(result.totalRevenue).toBe(100.29);
    expect(result.totalAmountPaid).toBe(33.63);
    expect(result.totalBalanceDue).toBe(66.66);
  });
});

describe("getWeekRange", () => {
  // 2026-01-05 is a Monday, 2026-01-10 is the following Saturday (in
  // America/La_Paz — the default). Reference instants are constructed
  // at noon UTC, not via the local Date constructor: getWeekRange is
  // now timezone-aware (it asks "what day is it in `timeZone`", not the
  // test-runner machine's own timezone — see lib/reports.ts), so a
  // local-time reference would make these tests' outcome depend on
  // whatever timezone happens to run them. Noon UTC is safely the same
  // calendar day in La_Paz (UTC-4) for every date used here.
  it("a Wednesday reference resolves to that week's Monday–Saturday", () => {
    const range = getWeekRange(new Date("2026-01-07T12:00:00.000Z")); // Wed
    expect(range.from.toISOString()).toBe("2026-01-05T04:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-01-11T03:59:59.999Z");
  });

  it("a Saturday reference (when the cron actually runs) stays within the same week", () => {
    const range = getWeekRange(new Date("2026-01-10T12:00:00.000Z")); // Sat
    expect(range.from.toISOString()).toBe("2026-01-05T04:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-01-11T03:59:59.999Z");
  });

  it("a Monday reference is the start of its own range", () => {
    const range = getWeekRange(new Date("2026-01-05T12:00:00.000Z")); // Mon
    expect(range.from.toISOString()).toBe("2026-01-05T04:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-01-11T03:59:59.999Z");
  });

  it("a Sunday reference belongs to the previous week, not the next one", () => {
    const range = getWeekRange(new Date("2026-01-11T12:00:00.000Z")); // Sun
    expect(range.from.toISOString()).toBe("2026-01-05T04:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-01-11T03:59:59.999Z");
  });

  it("a Monday reference the following week resolves to that week instead", () => {
    const range = getWeekRange(new Date("2026-01-12T12:00:00.000Z")); // Mon (next week)
    expect(range.from.toISOString()).toBe("2026-01-12T04:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-01-18T03:59:59.999Z");
  });

  it("honors an explicit timeZone override instead of the America/La_Paz default", () => {
    // Asia/Tokyo is UTC+9 — midnight Monday there is the *previous* day
    // 15:00 UTC (same conversion already verified in tests/timezone.test.ts).
    const range = getWeekRange(new Date("2026-01-07T12:00:00.000Z"), "Asia/Tokyo");
    expect(range.from.toISOString()).toBe("2026-01-04T15:00:00.000Z");
  });
});

describe("getReportData", () => {
  let testUserId: string;
  let productId: string;
  let inRangeSaleId: string;
  let outOfRangeSaleId: string;

  const range = { from: new Date(2026, 0, 5), to: new Date(2026, 0, 10, 23, 59, 59, 999) };

  beforeAll(async () => {
    const user = await prisma.user.upsert({
      where: { email: "vitest-reports@euforiamoda.test" },
      update: {},
      create: {
        name: "Vitest Reports Fixture",
        email: "vitest-reports@euforiamoda.test",
        passwordHash: "unused-in-tests",
        role: "ADMIN",
        city: "LA_PAZ",
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.movementLog.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    const product = await prisma.product.create({
      data: {
        kind: "UNIT",
        description: `${TEST_TAG}product`,
        color: "Rojo",
        size: "M",
        quantity: 10,
        price: 30,
        city: "LA_PAZ",
        createdById: testUserId,
      },
    });
    productId = product.id;

    // One sale inside the range (Wednesday of that week), one well
    // outside it (a month later) — getReportData's `saleDate` filter must
    // only pick up the first.
    const inRangeSale = await createSale(
      {
        productId,
        quantity: 2,
        unitPrice: 30,
        city: "LA_PAZ",
        saleDate: new Date(2026, 0, 7),
        saleType: "CASH",
        paymentMethod: "CASH",
        amountPaid: 60,
      },
      testUserId,
    );
    inRangeSaleId = inRangeSale.id;

    const outOfRangeSale = await createSale(
      {
        productId,
        quantity: 1,
        unitPrice: 30,
        city: "LA_PAZ",
        saleDate: new Date(2026, 1, 15),
        saleType: "CASH",
        paymentMethod: "CASH",
        amountPaid: 30,
      },
      testUserId,
    );
    outOfRangeSaleId = outOfRangeSale.id;
  });

  afterEach(async () => {
    await prisma.sale.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
  });

  it("only includes sales whose saleDate falls within the range", async () => {
    const data = await getReportData(range);
    const saleIds = data.sales.map((sale) => sale.id);
    expect(saleIds).toContain(inRangeSaleId);
    expect(saleIds).not.toContain(outOfRangeSaleId);
  });

  it("converts Decimal fields to numbers correctly in the summary", async () => {
    const data = await getReportData(range);
    // Only the in-range sale (qty 2 * 30 = 60) should count.
    expect(data.salesSummary).toEqual({
      count: 1,
      totalRevenue: 60,
      totalAmountPaid: 60,
      totalBalanceDue: 0,
    });
  });

  it("includes current inventory regardless of the sale date range", async () => {
    const data = await getReportData(range);
    expect(data.products.some((product) => product.id === productId)).toBe(true);
  });
});

describe("GET /api/cron/weekly-report — secret enforcement", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeAll(() => {
    process.env.CRON_SECRET = "vitest-cron-secret";
  });

  afterAll(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("rejects a request with no secret at all", async () => {
    const request = new NextRequest("http://localhost/api/cron/weekly-report");
    const response = await weeklyReportCron(request);
    expect(response.status).toBe(401);
  });

  it("rejects a request with the wrong secret in the query string", async () => {
    const request = new NextRequest(
      "http://localhost/api/cron/weekly-report?secret=wrong-secret",
    );
    const response = await weeklyReportCron(request);
    expect(response.status).toBe(401);
  });

  it("rejects a request with the wrong Authorization header", async () => {
    const request = new NextRequest(
      "http://localhost/api/cron/weekly-report",
      { headers: { authorization: "Bearer wrong-secret" } },
    );
    const response = await weeklyReportCron(request);
    expect(response.status).toBe(401);
  });
});
