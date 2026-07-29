import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  createMaterial,
  updateMaterial,
  listMaterialStockMovements,
} from "@/lib/inventory";

// Money/stock-touching (CLAUDE.md section 7) — mirrors
// tests/product-stock-history.test.ts, adjusted for Material's Decimal
// quantity (unlike Product's Int) and the lack of a sale path.

const TEST_TAG = "VITEST_MATSTOCKHIST_";
let adminId: string;

beforeAll(async () => {
  const admin = await prisma.user.upsert({
    where: { email: "vitest-matstockhist-admin@euforiamoda.test" },
    update: {},
    create: {
      name: "Vitest MatStockHist Admin",
      email: "vitest-matstockhist-admin@euforiamoda.test",
      passwordHash: "unused-in-tests",
      role: "ADMIN",
      city: "LA_PAZ",
    },
  });
  adminId = admin.id;
});

afterAll(async () => {
  await prisma.materialStockMovement.deleteMany({ where: { userId: adminId } });
  await prisma.movementLog.deleteMany({ where: { userId: adminId } });
  await prisma.user.delete({ where: { id: adminId } });
  await prisma.$disconnect();
});

describe("createMaterial — stock movement", () => {
  let materialId: string;

  afterEach(async () => {
    if (!materialId) return;
    await prisma.materialStockMovement.deleteMany({ where: { materialId } });
    await prisma.material.deleteMany({ where: { id: materialId } });
  });

  it("writes a CREATED row when starting quantity is positive", async () => {
    const material = await createMaterial(
      { materialType: `${TEST_TAG}type`, type: "Algodón", quantity: 5.25, unit: "METERS", city: "LA_PAZ", purchasePrice: 3 },
      adminId,
    );
    materialId = material.id;

    const movements = await listMaterialStockMovements(materialId);
    expect(movements).toHaveLength(1);
    expect(movements[0].quantityBefore.toString()).toBe("0");
    expect(movements[0].quantityAfter.toString()).toBe("5.25");
    expect(movements[0].delta.toString()).toBe("5.25");
    expect(movements[0].reason).toBe("CREATED");
    expect(movements[0].userId).toBe(adminId);
  });

  it("writes no row when starting quantity is zero", async () => {
    const material = await createMaterial(
      { materialType: `${TEST_TAG}type-zero`, type: "Algodón", quantity: 0, unit: "METERS", city: "LA_PAZ", purchasePrice: 3 },
      adminId,
    );
    materialId = material.id;

    const movements = await listMaterialStockMovements(materialId);
    expect(movements).toHaveLength(0);
  });
});

describe("updateMaterial — stock movement", () => {
  let materialId: string;

  beforeEach(async () => {
    const material = await createMaterial(
      { materialType: `${TEST_TAG}update`, type: "Algodón", quantity: 10, unit: "METERS", city: "LA_PAZ", purchasePrice: 4 },
      adminId,
    );
    materialId = material.id;
  });

  afterEach(async () => {
    await prisma.materialStockMovement.deleteMany({ where: { materialId } });
    await prisma.material.deleteMany({ where: { id: materialId } });
  });

  it("writes a MANUAL_ADJUSTMENT row when the edited quantity differs (decrease)", async () => {
    await updateMaterial(
      { id: materialId, materialType: `${TEST_TAG}update`, type: "Algodón", quantity: 6.5, unit: "METERS", city: "LA_PAZ", purchasePrice: 4 },
      adminId,
    );

    const movements = await listMaterialStockMovements(materialId);
    expect(movements[0]).toMatchObject({ reason: "MANUAL_ADJUSTMENT" });
    expect(movements[0].quantityBefore.toString()).toBe("10");
    expect(movements[0].quantityAfter.toString()).toBe("6.5");
    expect(movements[0].delta.toString()).toBe("-3.5");
  });

  it("writes a MANUAL_ADJUSTMENT row when the edited quantity differs (increase)", async () => {
    await updateMaterial(
      { id: materialId, materialType: `${TEST_TAG}update`, type: "Algodón", quantity: 15, unit: "METERS", city: "LA_PAZ", purchasePrice: 4 },
      adminId,
    );

    const movements = await listMaterialStockMovements(materialId);
    expect(movements[0].delta.toString()).toBe("5");
    expect(movements[0].delta.isPositive()).toBe(true);
  });

  it("writes no additional row when the edited quantity is unchanged", async () => {
    await updateMaterial(
      { id: materialId, materialType: `${TEST_TAG}update-renamed`, type: "Algodón", quantity: 10, unit: "METERS", city: "LA_PAZ", purchasePrice: 4 },
      adminId,
    );

    // Only the original CREATED row from beforeEach — no MANUAL_ADJUSTMENT added.
    const movements = await listMaterialStockMovements(materialId);
    expect(movements).toHaveLength(1);
    expect(movements[0].reason).toBe("CREATED");
  });
});

describe("listMaterialStockMovements", () => {
  let materialId: string;

  afterEach(async () => {
    await prisma.materialStockMovement.deleteMany({ where: { materialId } });
    await prisma.material.deleteMany({ where: { id: materialId } });
  });

  it("orders by most recent first and includes the acting user's name", async () => {
    const material = await createMaterial(
      { materialType: `${TEST_TAG}list`, type: "Algodón", quantity: 8, unit: "METERS", city: "LA_PAZ", purchasePrice: 2 },
      adminId,
    );
    materialId = material.id;

    await updateMaterial(
      { id: materialId, materialType: `${TEST_TAG}list`, type: "Algodón", quantity: 12, unit: "METERS", city: "LA_PAZ", purchasePrice: 2 },
      adminId,
    );

    const movements = await listMaterialStockMovements(materialId);
    expect(movements).toHaveLength(2);
    expect(movements[0].reason).toBe("MANUAL_ADJUSTMENT"); // most recent first
    expect(movements[1].reason).toBe("CREATED");
    expect(movements[0].user.name).toBe("Vitest MatStockHist Admin");
  });
});
