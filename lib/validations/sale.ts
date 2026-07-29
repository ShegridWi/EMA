import { z } from "zod";
import { City, SaleType, PaymentMethod } from "@/app/generated/prisma/enums";

// `deliveryDate` is reused as a generic "expected completion date" for
// both ORDER (delivery date) and RESERVATION (date the balance is
// expected to be settled) — see 04-scope-mvp.md's resolved "Order vs.
// Reservation" assumption. Required whenever saleType isn't CASH.
export const createSaleSchema = z
  .object({
    productId: z.uuid(),
    quantity: z.coerce.number().int().positive(),
    unitPrice: z.coerce.number().nonnegative(),
    city: z.enum(City),
    saleDate: z.coerce.date(),
    saleType: z.enum(SaleType),
    paymentMethod: z.enum(PaymentMethod),
    amountPaid: z.coerce.number().nonnegative(),
    deliveryDate: z.coerce.date().optional(),
    customerName: z.string().min(1).optional(),
    customerPhone: z.string().min(1).optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.saleType === "CASH" || data.deliveryDate !== undefined, {
    message: "deliveryDate is required for ORDER/RESERVATION sales",
    path: ["deliveryDate"],
  });

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
