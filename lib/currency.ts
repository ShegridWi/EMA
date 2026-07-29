// System-wide currency handling. The business operates in Bolivianos;
// USD exists as a recognized value for later (e.g. if a sale or price
// ever needs to be recorded in dollars), but nothing in the app collects
// a currency choice yet — every amount is assumed BOB until a form
// actually asks. See 04-scope-mvp.md for this default decision.
export const CURRENCY_SYMBOLS = {
  BOB: "Bs",
  USD: "$",
} as const;

export type Currency = keyof typeof CURRENCY_SYMBOLS;

export const DEFAULT_CURRENCY: Currency = "BOB";

// `amount` accepts the string form of a serialized Decimal (see
// serializeMaterial/serializeProduct/serializeSale in lib/inventory.ts)
// as well as a plain number, so callers can pass either.
export function formatCurrency(
  amount: number | string,
  currency: Currency = DEFAULT_CURRENCY,
): string {
  const numericAmount =
    typeof amount === "number" ? amount : Number.parseFloat(amount);
  const symbol = CURRENCY_SYMBOLS[currency];
  return `${symbol} ${numericAmount.toFixed(2)}`;
}
