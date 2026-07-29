import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  createUnitProduct,
  createSetProduct,
  updateProduct,
  createSale,
  returnSale,
  voidSale,
  listProductStockMovements,
} from "@/lib/inventory";

// Money/stock-touching (CLAUDE.md section 7) — every function here
// writes to Product.quantity, so each write path gets direct coverage,
// same rigor as tests/sales.test.ts. Integration tests against the real
// local Postgres, same fixture-tagging convention as the rest of
// tests/*.test.ts.

const TEST_TAG = "VITEST_STOCKHIST_";
let adminId: string;
let sellerId: string;

beforeAll(async () => {
  const admin = await prisma.user.upsert({
    where: { email: "vitest-stockhist-admin@euforiamoda.test" },
    update: {},
    create: {
      name: "Vitest StockHist Admin",
      email: "vitest-stockhist-admin@euforiamoda.test",
      passwordHash: "unused-in-tests",
      role: "ADMIN",
      city: "LA_PAZ",
    },
  });
  adminId = admin.id;

  const seller = await prisma.user.upsert({
    where: { email: "vitest-stockhist-seller@euforiamoda.test" },
    update: {},
    create: {
      name: "Vitest StockHist Seller",
      email: "vitest-stockhist-seller@euforiamoda.test",
      passwordHash: "unused-in-tests",
      role: "SELLER",
      city: "LA_PAZ",
    },
  });
  sellerId = seller.id;
});

afterAll(async () => {
  await prisma.productStockMovement.deleteMany({
    where: { userId: { in: [adminId, sellerId] } },
  });
  await prisma.movementLog.deleteMany({
    where: { userId: { in: [adminId, sellerId] } },
  });
  await prisma.user.deleteMany({ where: { id: { in: [adminId, sellerId] } } });
  await prisma.$disconnect();
});

describe("createUnitProduct — stock movement", () => {
  let productId: string;

  afterEach(async () => {
    if (!productId) return;
    await prisma.productStockMovement.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
  });

  it("writes a CREATED row when starting quantity is positive", async () => {
    const product = await createUnitProduct(
      { description: `${TEST_TAG}unit`, color: "Azul", size: "M", quantity: 5, price: 20, city: "LA_PAZ" },
      adminId,
    );
    productId = product.id;

    const movements = await listProductStockMovements(productId);
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      quantityBefore: 0,
      quantityAfter: 5,
      delta: 5,
      reason: "CREATED",
      userId: adminId,
      saleId: null,
    });
  });

  it("writes no row when starting quantity is zero", async () => {
    const product = await createUnitProduct(
      { description: `${TEST_TAG}unit-zero`, color: "Azul", size: "M", quantity: 0, price: 20, city: "LA_PAZ" },
      adminId,
    );
    productId = product.id;

    const movements = await listProductStockMovements(productId);
    expect(movements).toHaveLength(0);
  });
});

describe("createSetProduct — stock movement", () => {
  let setId: string;
  let topId: string;
  let bottomId: string;

  afterEach(async () => {
    const ids = [setId, topId, bottomId].filter(Boolean);
    await prisma.productStockMovement.deleteMany({ where: { productId: { in: ids } } });
    await prisma.product.deleteMany({ where: { id: { in: ids } } });
  });

  it("writes a CREATED row per piece with positive quantity, none for the SET container", async () => {
    const { set, pieces } = await createSetProduct(
      {
        description: `${TEST_TAG}set`,
        color: "Verde",
        size: "L",
        price: 100,
        city: "LA_PAZ",
        topQuantity: 3,
        bottomQuantity: 0,
        includeCap: false,
        capQuantity: 0,
      },
      adminId,
    );
    setId = set.id;
    topId = pieces.find((p) => p.pieceRole === "TOP")!.id;
    bottomId = pieces.find((p) => p.pieceRole === "BOTTOM")!.id;

    const setMovements = await listProductStockMovements(setId);
    expect(setMovements).toHaveLength(0);

    const topMovements = await listProductStockMovements(topId);
    expect(topMovements).toHaveLength(1);
    expect(topMovements[0]).toMatchObject({ quantityBefore: 0, quantityAfter: 3, reason: "CREATED" });

    // bottomQuantity was 0 — no row expected.
    const bottomMovements = await listProductStockMovements(bottomId);
    expect(bottomMovements).toHaveLength(0);
  });
});

describe("updateProduct — stock movement", () => {
  let productId: string;

  beforeEach(async () => {
    const product = await createUnitProduct(
      { description: `${TEST_TAG}update`, color: "Rojo", size: "S", quantity: 4, price: 10, city: "LA_PAZ" },
      adminId,
    );
    productId = product.id;
  });

  afterEach(async () => {
    await prisma.productStockMovement.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
  });

  it("writes a MANUAL_ADJUSTMENT row when the edited quantity differs", async () => {
    await updateProduct(
      { id: productId, description: `${TEST_TAG}update`, color: "Rojo", size: "S", quantity: 9, price: 10, city: "LA_PAZ" },
      adminId,
    );

    const movements = await listProductStockMovements(productId);
    // [0] is the most recent (desc order) — the manual adjustment.
    expect(movements[0]).toMatchObject({
      quantityBefore: 4,
      quantityAfter: 9,
      delta: 5,
      reason: "MANUAL_ADJUSTMENT",
      userId: adminId,
    });
  });

  it("writes no additional row when the edited quantity is unchanged", async () => {
    await updateProduct(
      { id: productId, description: `${TEST_TAG}update-renamed`, color: "Rojo", size: "S", quantity: 4, price: 10, city: "LA_PAZ" },
      adminId,
    );

    // Only the original CREATED row from beforeEach — no MANUAL_ADJUSTMENT added.
    const movements = await listProductStockMovements(productId);
    expect(movements).toHaveLength(1);
    expect(movements[0].reason).toBe("CREATED");
  });
});

describe("createSale / returnSale / voidSale — stock movement", () => {
  let productId: string;

  beforeEach(async () => {
    const product = await createUnitProduct(
      { description: `${TEST_TAG}sale`, color: "Negro", size: "M", quantity: 10, price: 30, city: "LA_PAZ" },
      adminId,
    );
    productId = product.id;
  });

  afterEach(async () => {
    await prisma.productStockMovement.deleteMany({ where: { productId } });
    await prisma.sale.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
  });

  it("writes a SALE row linked to the sale, attributed to the seller", async () => {
    const sale = await createSale(
      { productId, quantity: 3, unitPrice: 30, city: "LA_PAZ", saleDate: new Date(), saleType: "CASH", paymentMethod: "CASH", amountPaid: 90 },
      sellerId,
    );

    const movements = await listProductStockMovements(productId);
    const saleMovement = movements.find((m) => m.reason === "SALE");
    expect(saleMovement).toMatchObject({
      quantityBefore: 10,
      quantityAfter: 7,
      delta: -3,
      userId: sellerId,
      saleId: sale.id,
    });
  });

  it("writes a RETURN row attributed to whoever reversed it, restoring the delta sign", async () => {
    const sale = await createSale(
      { productId, quantity: 3, unitPrice: 30, city: "LA_PAZ", saleDate: new Date(), saleType: "CASH", paymentMethod: "CASH", amountPaid: 90 },
      sellerId,
    );
    await returnSale(sale.id, adminId, "cliente devolvió");

    const movements = await listProductStockMovements(productId);
    const returnMovement = movements.find((m) => m.reason === "RETURN");
    expect(returnMovement).toMatchObject({
      quantityBefore: 7,
      quantityAfter: 10,
      delta: 3,
      userId: adminId,
      saleId: sale.id,
    });
  });

  it("writes a VOID row (not RETURN) when the sale is voided instead", async () => {
    const sale = await createSale(
      { productId, quantity: 2, unitPrice: 30, city: "LA_PAZ", saleDate: new Date(), saleType: "CASH", paymentMethod: "CASH", amountPaid: 60 },
      sellerId,
    );
    await voidSale(sale.id, adminId);

    const movements = await listProductStockMovements(productId);
    expect(movements.some((m) => m.reason === "VOID")).toBe(true);
    expect(movements.some((m) => m.reason === "RETURN")).toBe(false);
  });

  it("writes one SALE row per affected piece for a SET sale", async () => {
    const { set, pieces } = await createSetProduct(
      {
        description: `${TEST_TAG}sale-set`,
        color: "Blanco",
        size: "M",
        price: 80,
        city: "LA_PAZ",
        topQuantity: 5,
        bottomQuantity: 5,
        includeCap: false,
        capQuantity: 0,
      },
      adminId,
    );
    const topId = pieces.find((p) => p.pieceRole === "TOP")!.id;
    const bottomId = pieces.find((p) => p.pieceRole === "BOTTOM")!.id;

    try {
      const sale = await createSale(
        { productId: set.id, quantity: 2, unitPrice: 80, city: "LA_PAZ", saleDate: new Date(), saleType: "CASH", paymentMethod: "CASH", amountPaid: 160 },
        sellerId,
      );

      const topMovements = await listProductStockMovements(topId);
      const bottomMovements = await listProductStockMovements(bottomId);
      expect(topMovements.find((m) => m.saleId === sale.id)).toMatchObject({ quantityBefore: 5, quantityAfter: 3, reason: "SALE" });
      expect(bottomMovements.find((m) => m.saleId === sale.id)).toMatchObject({ quantityBefore: 5, quantityAfter: 3, reason: "SALE" });
    } finally {
      await prisma.productStockMovement.deleteMany({ where: { productId: { in: [set.id, topId, bottomId] } } });
      await prisma.sale.deleteMany({ where: { productId: set.id } });
      await prisma.product.deleteMany({ where: { id: { in: [set.id, topId, bottomId] } } });
    }
  });
});

describe("listProductStockMovements", () => {
  let productId: string;

  afterEach(async () => {
    await prisma.productStockMovement.deleteMany({ where: { productId } });
    await prisma.sale.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
  });

  it("orders by most recent first and includes the acting user's name", async () => {
    const product = await createUnitProduct(
      { description: `${TEST_TAG}list`, color: "Gris", size: "L", quantity: 6, price: 12, city: "LA_PAZ" },
      adminId,
    );
    productId = product.id;

    await updateProduct(
      { id: productId, description: `${TEST_TAG}list`, color: "Gris", size: "L", quantity: 8, price: 12, city: "LA_PAZ" },
      adminId,
    );

    const movements = await listProductStockMovements(productId);
    expect(movements).toHaveLength(2);
    expect(movements[0].reason).toBe("MANUAL_ADJUSTMENT"); // most recent first
    expect(movements[1].reason).toBe("CREATED");
    expect(movements[0].user.name).toBe("Vitest StockHist Admin");
  });
});
