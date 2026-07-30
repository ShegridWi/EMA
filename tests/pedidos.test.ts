import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  createPublicPedido,
  listPedidos,
  claimPedido,
  convertPedidoToSale,
  RateLimitedError,
  PedidoAlreadyClaimedError,
  PedidoNotClaimableError,
} from "@/lib/pedidos";
import { publicPedidoSchema } from "@/lib/validations/pedido";
import { InsufficientStockError } from "@/lib/inventory";

// Integration tests against the real local Postgres (docker compose
// `ema-db-1`), same convention as tests/sales.test.ts — every fixture
// created here is tagged with TEST_TAG and hard-deleted in
// afterEach/afterAll. Requires `docker compose up -d`.

describe("publicPedidoSchema", () => {
  const base = {
    customerName: "Ana Pérez",
    customerPhone: "70011122",
    notes: "Quiero un pijama azul talla M",
    gender: "FEMALE" as const,
    model: "clasico",
    color: "colorNavy",
    city: "LA_PAZ" as const,
  };

  it("accepts a valid ORDER submission (size present)", () => {
    const parsed = publicPedidoSchema.parse({ ...base, size: "M" });
    expect(parsed.size).toBe("M");
  });

  it("accepts a valid QUOTE submission (no size)", () => {
    const parsed = publicPedidoSchema.parse(base);
    expect(parsed.size).toBeUndefined();
  });

  it("rejects an unknown model key", () => {
    expect(() => publicPedidoSchema.parse({ ...base, model: "not-a-model" })).toThrow();
  });

  it("rejects a color that doesn't belong to the submitted gender's palette", () => {
    // colorSkyBlue only exists in the female palette in lib/landing-catalog.ts
    expect(() =>
      publicPedidoSchema.parse({ ...base, gender: "MALE", color: "colorSkyBlue" }),
    ).toThrow();
  });

  it("silently drops a client-supplied kind field rather than trusting it", () => {
    const parsed = publicPedidoSchema.parse({ ...base, kind: "ORDER" }) as Record<
      string,
      unknown
    >;
    expect(parsed).not.toHaveProperty("kind");
  });
});

const TEST_TAG = "VITEST_PEDIDOS_";
const TEST_IP = "203.0.113.42";
let sellerLaPazId: string;
let sellerSantaCruzId: string;
let adminId: string;

beforeAll(async () => {
  const [sellerLaPaz, sellerSantaCruz, admin] = await Promise.all([
    prisma.user.upsert({
      where: { email: "vitest-pedidos-seller-lp@euforiamoda.test" },
      update: {},
      create: {
        name: "Vitest Pedidos Seller LP",
        email: "vitest-pedidos-seller-lp@euforiamoda.test",
        passwordHash: "unused-in-tests",
        role: "SELLER",
        city: "LA_PAZ",
      },
    }),
    prisma.user.upsert({
      where: { email: "vitest-pedidos-seller-sc@euforiamoda.test" },
      update: {},
      create: {
        name: "Vitest Pedidos Seller SC",
        email: "vitest-pedidos-seller-sc@euforiamoda.test",
        passwordHash: "unused-in-tests",
        role: "SELLER",
        city: "SANTA_CRUZ",
      },
    }),
    prisma.user.upsert({
      where: { email: "vitest-pedidos-admin@euforiamoda.test" },
      update: {},
      create: {
        name: "Vitest Pedidos Admin",
        email: "vitest-pedidos-admin@euforiamoda.test",
        passwordHash: "unused-in-tests",
        role: "ADMIN",
        city: "LA_PAZ",
      },
    }),
  ]);
  sellerLaPazId = sellerLaPaz.id;
  sellerSantaCruzId = sellerSantaCruz.id;
  adminId = admin.id;
});

afterAll(async () => {
  await prisma.productStockMovement.deleteMany({
    where: { userId: { in: [sellerLaPazId, sellerSantaCruzId, adminId] } },
  });
  await prisma.sale.deleteMany({
    where: { sellerId: { in: [sellerLaPazId, sellerSantaCruzId, adminId] } },
  });
  await prisma.movementLog.deleteMany({
    where: { userId: { in: [sellerLaPazId, sellerSantaCruzId, adminId] } },
  });
  await prisma.publicRequest.deleteMany({ where: { submissionIp: TEST_IP } });
  await prisma.publicRequest.deleteMany({
    where: { assignedSellerId: { in: [sellerLaPazId, sellerSantaCruzId, adminId] } },
  });
  await prisma.product.deleteMany({ where: { description: { startsWith: TEST_TAG } } });
  await prisma.user.deleteMany({
    where: { id: { in: [sellerLaPazId, sellerSantaCruzId, adminId] } },
  });
  await prisma.$disconnect();
});

function buildInput(overrides: Partial<Parameters<typeof createPublicPedido>[0]> = {}) {
  return {
    customerName: "Ana Pérez",
    customerPhone: "70011122",
    notes: `${TEST_TAG}notes`,
    gender: "FEMALE" as const,
    model: "clasico",
    color: "colorNavy",
    city: "LA_PAZ" as const,
    website: undefined,
    ...overrides,
  };
}

describe("createPublicPedido", () => {
  afterEach(async () => {
    await prisma.publicRequest.deleteMany({ where: { submissionIp: TEST_IP } });
  });

  it("derives kind=ORDER when a size is present", async () => {
    const pedido = await createPublicPedido(buildInput({ size: "M" }), { ip: TEST_IP });
    expect(pedido.kind).toBe("ORDER");
    expect(pedido.status).toBe("PENDING");
  });

  it("derives kind=QUOTE when no size is given", async () => {
    const pedido = await createPublicPedido(buildInput(), { ip: TEST_IP });
    expect(pedido.kind).toBe("QUOTE");
  });

  it("rate-limits after 3 submissions from the same IP within the short window", async () => {
    await createPublicPedido(buildInput(), { ip: TEST_IP });
    await createPublicPedido(buildInput(), { ip: TEST_IP });
    await createPublicPedido(buildInput(), { ip: TEST_IP });

    await expect(createPublicPedido(buildInput(), { ip: TEST_IP })).rejects.toBeInstanceOf(
      RateLimitedError,
    );
  });

  it("does not rate-limit a different IP", async () => {
    await createPublicPedido(buildInput(), { ip: TEST_IP });
    await createPublicPedido(buildInput(), { ip: TEST_IP });
    await createPublicPedido(buildInput(), { ip: TEST_IP });

    const otherIp = "198.51.100.7";
    const pedido = await createPublicPedido(buildInput(), { ip: otherIp });
    expect(pedido.submissionIp).toBe(otherIp);
    await prisma.publicRequest.deleteMany({ where: { submissionIp: otherIp } });
  });
});

describe("claimPedido", () => {
  let pedidoId: string;

  beforeEach(async () => {
    const pedido = await createPublicPedido(buildInput({ size: "M", city: "LA_PAZ" }), {
      ip: TEST_IP,
    });
    pedidoId = pedido.id;
  });

  afterEach(async () => {
    await prisma.movementLog.deleteMany({ where: { entityId: pedidoId } });
    await prisma.publicRequest.deleteMany({ where: { id: pedidoId } });
  });

  it("assigns the pedido to the claiming seller and flips status to ATTENDED", async () => {
    const pedido = await claimPedido(pedidoId, sellerLaPazId, {
      isAdmin: false,
      sellerCity: "LA_PAZ",
    });
    expect(pedido.status).toBe("ATTENDED");
    expect(pedido.assignedSellerId).toBe(sellerLaPazId);
  });

  it("rejects a claim from a seller in a different city", async () => {
    await expect(
      claimPedido(pedidoId, sellerSantaCruzId, { isAdmin: false, sellerCity: "SANTA_CRUZ" }),
    ).rejects.toBeInstanceOf(PedidoAlreadyClaimedError);
  });

  it("allows an admin to claim regardless of city", async () => {
    const pedido = await claimPedido(pedidoId, adminId, {
      isAdmin: true,
      sellerCity: "SANTA_CRUZ",
    });
    expect(pedido.assignedSellerId).toBe(adminId);
  });

  it("only lets exactly one of two concurrent claims succeed", async () => {
    const results = await Promise.allSettled([
      claimPedido(pedidoId, sellerLaPazId, { isAdmin: false, sellerCity: "LA_PAZ" }),
      claimPedido(pedidoId, adminId, { isAdmin: true, sellerCity: "LA_PAZ" }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    if (rejected[0]?.status === "rejected") {
      expect(rejected[0].reason).toBeInstanceOf(PedidoAlreadyClaimedError);
    }
  });

  it("writes a CLAIM_PEDIDO MovementLog entry", async () => {
    await claimPedido(pedidoId, sellerLaPazId, { isAdmin: false, sellerCity: "LA_PAZ" });
    const logs = await prisma.movementLog.findMany({
      where: { entityId: pedidoId, action: "CLAIM_PEDIDO" },
    });
    expect(logs).toHaveLength(1);
  });
});

describe("convertPedidoToSale", () => {
  let pedidoId: string;
  let productId: string;

  beforeEach(async () => {
    const product = await prisma.product.create({
      data: {
        kind: "UNIT",
        description: `${TEST_TAG}product`,
        color: "Azul",
        size: "M",
        quantity: 5,
        price: 120,
        city: "LA_PAZ",
        createdById: sellerLaPazId,
      },
    });
    productId = product.id;

    const pedido = await createPublicPedido(buildInput({ size: "M", city: "LA_PAZ" }), {
      ip: TEST_IP,
    });
    pedidoId = pedido.id;
  });

  afterEach(async () => {
    await prisma.productStockMovement.deleteMany({ where: { productId } });
    await prisma.sale.deleteMany({ where: { productId } });
    await prisma.movementLog.deleteMany({ where: { entityId: pedidoId } });
    await prisma.publicRequest.deleteMany({ where: { id: pedidoId } });
    await prisma.product.deleteMany({ where: { id: productId } });
  });

  const saleInput = () => ({
    productId,
    quantity: 2,
    unitPrice: 120,
    city: "LA_PAZ" as const,
    saleDate: new Date(),
    saleType: "CASH" as const,
    paymentMethod: "CASH" as const,
    amountPaid: 240,
  });

  it("rejects conversion when the pedido isn't ATTENDED yet", async () => {
    await expect(
      convertPedidoToSale(pedidoId, saleInput(), sellerLaPazId, false),
    ).rejects.toBeInstanceOf(PedidoNotClaimableError);
  });

  it("rejects conversion by a seller who isn't the assignee", async () => {
    await claimPedido(pedidoId, sellerLaPazId, { isAdmin: false, sellerCity: "LA_PAZ" });
    await expect(
      convertPedidoToSale(pedidoId, saleInput(), sellerSantaCruzId, false),
    ).rejects.toBeInstanceOf(PedidoNotClaimableError);
  });

  it("creates a real Sale, decrements stock, and marks the pedido CONVERTED", async () => {
    await claimPedido(pedidoId, sellerLaPazId, { isAdmin: false, sellerCity: "LA_PAZ" });

    const sale = await convertPedidoToSale(pedidoId, saleInput(), sellerLaPazId, false);
    expect(sale.totalPrice).toBe("240");

    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.quantity).toBe(3);

    const pedido = await prisma.publicRequest.findUniqueOrThrow({ where: { id: pedidoId } });
    expect(pedido.status).toBe("CONVERTED");
    expect(pedido.convertedSaleId).toBe(sale.id);

    const logs = await prisma.movementLog.findMany({
      where: { entityId: pedidoId, action: "CONVERT_PEDIDO" },
    });
    expect(logs).toHaveLength(1);
  });

  it("propagates InsufficientStockError instead of silently converting", async () => {
    await claimPedido(pedidoId, sellerLaPazId, { isAdmin: false, sellerCity: "LA_PAZ" });

    await expect(
      convertPedidoToSale(
        pedidoId,
        { ...saleInput(), quantity: 999 },
        sellerLaPazId,
        false,
      ),
    ).rejects.toBeInstanceOf(InsufficientStockError);

    const pedido = await prisma.publicRequest.findUniqueOrThrow({ where: { id: pedidoId } });
    expect(pedido.status).toBe("ATTENDED"); // unchanged, not falsely CONVERTED
  });
});

describe("listPedidos — pending-first ordering", () => {
  let ids: string[] = [];

  afterEach(async () => {
    await prisma.movementLog.deleteMany({ where: { entityId: { in: ids } } });
    await prisma.publicRequest.deleteMany({ where: { id: { in: ids } } });
    ids = [];
  });

  it("always lists PENDING rows before ATTENDED/CANCELLED ones, regardless of creation order", async () => {
    const attended = await createPublicPedido(buildInput({ size: "M" }), { ip: TEST_IP });
    await claimPedido(attended.id, sellerLaPazId, { isAdmin: false, sellerCity: "LA_PAZ" });

    const pending = await createPublicPedido(buildInput({ size: "S" }), { ip: TEST_IP });

    ids = [attended.id, pending.id];

    const list = await listPedidos({ city: "LA_PAZ" });
    const relevant = list.filter((p) => ids.includes(p.id));
    const pendingIndex = relevant.findIndex((p) => p.id === pending.id);
    const attendedIndex = relevant.findIndex((p) => p.id === attended.id);
    expect(pendingIndex).toBeLessThan(attendedIndex);
  });
});
