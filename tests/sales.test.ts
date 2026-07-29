import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  calculateSaleTotals,
  createSale,
  returnSale,
  voidSale,
  listSales,
  InsufficientStockError,
  SaleNotFoundError,
} from "@/lib/inventory";

// These are integration tests against the real local Postgres (docker
// compose `ema-db-1`) — this project has no separate test-database
// infrastructure (CLAUDE.md section 1: prefer simple, low-maintenance
// solutions), so every fixture created here is tagged with
// TEST_TAG/testUserId and hard-deleted in afterEach/afterAll. Requires
// `docker compose up -d` to be running (see 05-nextjs-conventions.md).

const TEST_TAG = "VITEST_SALES_";
let testUserId: string;

beforeAll(async () => {
  const user = await prisma.user.upsert({
    where: { email: "vitest-sales@euforiamoda.test" },
    update: {},
    create: {
      name: "Vitest Sales Fixture",
      email: "vitest-sales@euforiamoda.test",
      passwordHash: "unused-in-tests",
      role: "SELLER",
      city: "LA_PAZ",
    },
  });
  testUserId = user.id;
});

afterAll(async () => {
  await prisma.sale.deleteMany({ where: { sellerId: testUserId } });
  await prisma.movementLog.deleteMany({ where: { userId: testUserId } });
  await prisma.product.deleteMany({
    where: { description: { startsWith: TEST_TAG } },
  });
  await prisma.user.delete({ where: { id: testUserId } });
  await prisma.$disconnect();
});

describe("calculateSaleTotals", () => {
  it("computes a fully-paid cash sale (balanceDue = 0)", () => {
    expect(calculateSaleTotals(2, 50, 100)).toEqual({
      totalPrice: 100,
      balanceDue: 0,
    });
  });

  it("computes a partially-paid reservation", () => {
    expect(calculateSaleTotals(3, 40, 50)).toEqual({
      totalPrice: 120,
      balanceDue: 70,
    });
  });

  it("computes an unpaid order (amountPaid = 0)", () => {
    expect(calculateSaleTotals(1, 200, 0)).toEqual({
      totalPrice: 200,
      balanceDue: 200,
    });
  });

  it("handles fractional unit prices without drifting", () => {
    expect(calculateSaleTotals(3, 33.33, 50)).toEqual({
      totalPrice: 99.99,
      balanceDue: 49.99,
    });
  });
});

describe("createSale — UNIT stock deduction", () => {
  let productId: string;

  beforeEach(async () => {
    const product = await prisma.product.create({
      data: {
        kind: "UNIT",
        description: `${TEST_TAG}unit`,
        color: "Azul",
        size: "M",
        quantity: 5,
        price: 50,
        city: "LA_PAZ",
        createdById: testUserId,
      },
    });
    productId = product.id;
  });

  afterEach(async () => {
    await prisma.sale.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
  });

  it("deducts the sold quantity from the product", async () => {
    await createSale(
      {
        productId,
        quantity: 2,
        unitPrice: 50,
        city: "LA_PAZ",
        saleDate: new Date(),
        saleType: "CASH",
        paymentMethod: "CASH",
        amountPaid: 100,
      },
      testUserId,
    );

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });
    expect(product.quantity).toBe(3);
  });

  it("creates a Sale row with denormalized fields and correct totals", async () => {
    const sale = await createSale(
      {
        productId,
        quantity: 2,
        unitPrice: 50,
        city: "LA_PAZ",
        saleDate: new Date(),
        saleType: "CASH",
        paymentMethod: "CASH",
        amountPaid: 100,
      },
      testUserId,
    );

    expect(sale.kind).toBe("UNIT");
    expect(sale.description).toBe(`${TEST_TAG}unit`);
    expect(sale.totalPrice.toString()).toBe("100");
    expect(sale.balanceDue.toString()).toBe("0");
    expect(sale.sellerId).toBe(testUserId);
  });

  it("writes a CREATE_SALE MovementLog entry", async () => {
    const sale = await createSale(
      {
        productId,
        quantity: 1,
        unitPrice: 50,
        city: "LA_PAZ",
        saleDate: new Date(),
        saleType: "CASH",
        paymentMethod: "CASH",
        amountPaid: 50,
      },
      testUserId,
    );

    const logs = await prisma.movementLog.findMany({
      where: { entityId: sale.id, action: "CREATE_SALE" },
    });
    expect(logs).toHaveLength(1);
  });

  it("rejects a sale with insufficient stock, without changing stock or creating a Sale", async () => {
    await expect(
      createSale(
        {
          productId,
          quantity: 999,
          unitPrice: 50,
          city: "LA_PAZ",
          saleDate: new Date(),
          saleType: "CASH",
          paymentMethod: "CASH",
          amountPaid: 0,
        },
        testUserId,
      ),
    ).rejects.toBeInstanceOf(InsufficientStockError);

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });
    expect(product.quantity).toBe(5); // unchanged

    const sales = await prisma.sale.findMany({ where: { productId } });
    expect(sales).toHaveLength(0);
  });
});

describe("createSale — SET stock deduction", () => {
  let setId: string;
  let topId: string;
  let bottomId: string;
  let capId: string;

  beforeEach(async () => {
    const set = await prisma.product.create({
      data: {
        kind: "SET",
        description: `${TEST_TAG}set`,
        color: "Verde",
        size: "L",
        quantity: 0,
        price: 150,
        city: "LA_PAZ",
        createdById: testUserId,
      },
    });
    setId = set.id;

    const [top, bottom, cap] = await Promise.all([
      prisma.product.create({
        data: {
          kind: "UNIT",
          description: `${TEST_TAG}set - Top`,
          color: "Verde",
          size: "L",
          quantity: 4,
          price: 150,
          city: "LA_PAZ",
          setId,
          pieceRole: "TOP",
          createdById: testUserId,
        },
      }),
      prisma.product.create({
        data: {
          kind: "UNIT",
          description: `${TEST_TAG}set - Bottom`,
          color: "Verde",
          size: "L",
          quantity: 4,
          price: 150,
          city: "LA_PAZ",
          setId,
          pieceRole: "BOTTOM",
          createdById: testUserId,
        },
      }),
      prisma.product.create({
        data: {
          kind: "UNIT",
          description: `${TEST_TAG}set - Cap`,
          color: "Verde",
          size: "L",
          quantity: 2, // deliberately lower, for the insufficient-stock test
          price: 150,
          city: "LA_PAZ",
          setId,
          pieceRole: "CAP",
          createdById: testUserId,
        },
      }),
    ]);
    topId = top.id;
    bottomId = bottom.id;
    capId = cap.id;
  });

  afterEach(async () => {
    await prisma.sale.deleteMany({ where: { productId: setId } });
    await prisma.product.deleteMany({
      where: { id: { in: [setId, topId, bottomId, capId] } },
    });
  });

  it("deducts the sold quantity from every piece", async () => {
    await createSale(
      {
        productId: setId,
        quantity: 2,
        unitPrice: 150,
        city: "LA_PAZ",
        saleDate: new Date(),
        saleType: "CASH",
        paymentMethod: "QR",
        amountPaid: 300,
      },
      testUserId,
    );

    const [top, bottom, cap] = await Promise.all([
      prisma.product.findUniqueOrThrow({ where: { id: topId } }),
      prisma.product.findUniqueOrThrow({ where: { id: bottomId } }),
      prisma.product.findUniqueOrThrow({ where: { id: capId } }),
    ]);
    expect(top.quantity).toBe(2);
    expect(bottom.quantity).toBe(2);
    expect(cap.quantity).toBe(0);
  });

  it("rejects the sale if ANY piece lacks stock, leaving all pieces untouched", async () => {
    // Cap only has 2 in stock; asking for 3 complete sets must fail even
    // though Top/Bottom have enough.
    await expect(
      createSale(
        {
          productId: setId,
          quantity: 3,
          unitPrice: 150,
          city: "LA_PAZ",
          saleDate: new Date(),
          saleType: "CASH",
          paymentMethod: "QR",
          amountPaid: 450,
        },
        testUserId,
      ),
    ).rejects.toBeInstanceOf(InsufficientStockError);

    const [top, bottom, cap] = await Promise.all([
      prisma.product.findUniqueOrThrow({ where: { id: topId } }),
      prisma.product.findUniqueOrThrow({ where: { id: bottomId } }),
      prisma.product.findUniqueOrThrow({ where: { id: capId } }),
    ]);
    // Nothing decremented — all-or-nothing.
    expect(top.quantity).toBe(4);
    expect(bottom.quantity).toBe(4);
    expect(cap.quantity).toBe(2);

    const sales = await prisma.sale.findMany({ where: { productId: setId } });
    expect(sales).toHaveLength(0);
  });
});

describe("returnSale / voidSale — UNIT", () => {
  let productId: string;
  let saleId: string;

  beforeEach(async () => {
    const product = await prisma.product.create({
      data: {
        kind: "UNIT",
        description: `${TEST_TAG}reverse-unit`,
        color: "Negro",
        size: "M",
        quantity: 5,
        price: 50,
        city: "LA_PAZ",
        createdById: testUserId,
      },
    });
    productId = product.id;

    const sale = await createSale(
      {
        productId,
        quantity: 2,
        unitPrice: 50,
        city: "LA_PAZ",
        saleDate: new Date(),
        saleType: "CASH",
        paymentMethod: "CASH",
        amountPaid: 100,
      },
      testUserId,
    );
    saleId = sale.id;
  });

  afterEach(async () => {
    await prisma.sale.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
  });

  it("returnSale restores stock and soft-deletes the sale", async () => {
    await returnSale(saleId, testUserId);

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });
    expect(product.quantity).toBe(5); // 3 (after the sale) + 2 restored

    const sale = await prisma.sale.findUniqueOrThrow({ where: { id: saleId } });
    expect(sale.deletedAt).not.toBeNull();

    const activeSales = await listSales({ sellerId: testUserId });
    expect(activeSales.some((s) => s.id === saleId)).toBe(false);
  });

  it("voidSale restores stock and soft-deletes the sale", async () => {
    await voidSale(saleId, testUserId);

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });
    expect(product.quantity).toBe(5);

    const sale = await prisma.sale.findUniqueOrThrow({ where: { id: saleId } });
    expect(sale.deletedAt).not.toBeNull();
  });

  it("writes RETURN_SALE / VOID_SALE MovementLog entries", async () => {
    await returnSale(saleId, testUserId);
    const returnLogs = await prisma.movementLog.findMany({
      where: { entityId: saleId, action: "RETURN_SALE" },
    });
    expect(returnLogs).toHaveLength(1);
  });

  it("stores the optional reason in the MovementLog metadata", async () => {
    await returnSale(saleId, testUserId, "Cliente devolvió por talla");
    const [log] = await prisma.movementLog.findMany({
      where: { entityId: saleId, action: "RETURN_SALE" },
    });
    expect((log.metadata as Record<string, unknown>).reason).toBe(
      "Cliente devolvió por talla",
    );
  });

  it("omits reason from metadata when none is given", async () => {
    await voidSale(saleId, testUserId);
    const [log] = await prisma.movementLog.findMany({
      where: { entityId: saleId, action: "VOID_SALE" },
    });
    expect(log.metadata as Record<string, unknown>).not.toHaveProperty(
      "reason",
    );
  });

  it("rejects reversing the same sale twice, without double-restoring stock", async () => {
    await returnSale(saleId, testUserId);

    await expect(returnSale(saleId, testUserId)).rejects.toBeInstanceOf(
      SaleNotFoundError,
    );
    await expect(voidSale(saleId, testUserId)).rejects.toBeInstanceOf(
      SaleNotFoundError,
    );

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });
    expect(product.quantity).toBe(5); // still just the one restore, not two
  });
});

describe("returnSale / voidSale — SET", () => {
  let setId: string;
  let topId: string;
  let bottomId: string;
  let saleId: string;

  beforeEach(async () => {
    const set = await prisma.product.create({
      data: {
        kind: "SET",
        description: `${TEST_TAG}reverse-set`,
        color: "Blanco",
        size: "S",
        quantity: 0,
        price: 100,
        city: "LA_PAZ",
        createdById: testUserId,
      },
    });
    setId = set.id;

    const [top, bottom] = await Promise.all([
      prisma.product.create({
        data: {
          kind: "UNIT",
          description: `${TEST_TAG}reverse-set - Top`,
          color: "Blanco",
          size: "S",
          quantity: 5,
          price: 100,
          city: "LA_PAZ",
          setId,
          pieceRole: "TOP",
          createdById: testUserId,
        },
      }),
      prisma.product.create({
        data: {
          kind: "UNIT",
          description: `${TEST_TAG}reverse-set - Bottom`,
          color: "Blanco",
          size: "S",
          quantity: 5,
          price: 100,
          city: "LA_PAZ",
          setId,
          pieceRole: "BOTTOM",
          createdById: testUserId,
        },
      }),
    ]);
    topId = top.id;
    bottomId = bottom.id;

    const sale = await createSale(
      {
        productId: setId,
        quantity: 2,
        unitPrice: 100,
        city: "LA_PAZ",
        saleDate: new Date(),
        saleType: "CASH",
        paymentMethod: "CASH",
        amountPaid: 200,
      },
      testUserId,
    );
    saleId = sale.id;
  });

  afterEach(async () => {
    await prisma.sale.deleteMany({ where: { productId: setId } });
    await prisma.product.deleteMany({
      where: { id: { in: [setId, topId, bottomId] } },
    });
  });

  it("restores stock to every piece", async () => {
    await returnSale(saleId, testUserId);

    const [top, bottom] = await Promise.all([
      prisma.product.findUniqueOrThrow({ where: { id: topId } }),
      prisma.product.findUniqueOrThrow({ where: { id: bottomId } }),
    ]);
    expect(top.quantity).toBe(5); // 3 (after the sale) + 2 restored
    expect(bottom.quantity).toBe(5);
  });
});
