# Business rules

## 1. Manufacturing (materials)

Inventory of raw materials used to produce the scrubs.

- Fields: material, color (if applicable), type, quantity, city.
- Only the **admin** can add/edit/delete.
- Sellers and admins can **view and search**.
- It has no sale price (it's an internal input), but it **does record the
  purchase price** at creation time (to be able to calculate production
  cost in the future).

## 2. Finished product (inventory)

Two product kinds:

### a) Set
Made up of 2 or 3 pieces:
- Top (required)
- Bottom / pants (required)
- Cap (**optional**)

When a new set is registered, the system must:
1. Ask how many pieces make up the set (2 or 3, indicating which ones).
2. Automatically create the individual record for each piece as a "unit"
   product, linked to the parent set, at quantity 0 (or the quantity the
   admin provides if there are already loose pieces).
3. This allows the top of a set to be sold on its own, decreasing top
   stock without affecting the bottom/cap count of that same batch.

### b) Unit
An individual piece (top, bottom, or cap on its own, without needing to
belong to a newly created set).

**Common fields**: kind (unit/set), description, color, quantity, price,
city, size.

- Only the **admin** adds/edits/deletes inventory.
- **Sellers and admins** can view the full list.
- The finished product's price **is recorded** at creation time (unlike
  manufacturing materials, where the purchase price is recorded; here it's
  the suggested sale price, but it can vary at the moment of the actual
  sale).

## 3. Sale

Performed by the **seller** (also accessible by the admin).

When registering a sale:
- Select product (unit or set), color, size, quantity.
- Set the **sale price** (may differ from the suggested price in
  inventory).
- City (inherited from the product / the seller's branch).
- **Payment method**: QR (the business's QR image can be shown in the UI)
  or cash.
- **Sale type**:
  - **Cash**: 100% paid at the moment.
  - **Reservation / to be settled**: partial payment, with a pending
    balance to be collected later (record amount paid, pending balance,
    and estimated date the balance will be settled).
  - **Order**: large / custom sale, may be fully or partially paid, with an
    estimated **delivery date**.
- On confirming the sale, the system automatically decreases stock in the
  corresponding inventory (the individual piece if it's a unit, or the
  corresponding pieces if it's a full set).

### Sale statuses
- `cash` — 100% paid, no pending payment management needed.
- `order` — custom order, may have a pending balance and a delivery date.
- `reservation` — partial payment with pending balance, not necessarily a
  large order.

`order` and `reservation` are confirmed as two distinct flows (not the
same concept under different names) — see the resolved assumption in
`04-scope-mvp.md`.

### Returns and voids (feature/sales)

**Admin only.** From the sales history, an admin can mark a sale as
**returned** (the customer brought the product back) or **void** it
(the sale was registered by mistake and should be undone). Both:

- Restore the stock the sale deducted — the whole quantity, back onto
  the same product (or every piece, for a set sale).
- Are recorded with a soft delete on the `Sale` row (`deletedAt`) —
  **never** a physical delete, consistent with section 5 below. The
  sale disappears from the active history but is kept for audit.
- Accept an optional free-text **reason** (e.g. "customer returned it,
  wrong size" / "registered by mistake") — recorded in the movement
  log entry for the action, not as a field on the sale itself, since
  it's context about the reversal, not about the original sale.
- Only differ in which action is logged (`RETURN_SALE` vs
  `VOID_SALE`), so a later report can tell a genuine customer return
  apart from an admin correcting a data-entry mistake.

A sale that was already returned or voided can't be reversed again
(the deduction was already restored once).

## 4. Cities

For now the system only handles two cities as a fixed catalog:
- La Paz
- Santa Cruz

They must be modeled as a simple enum/catalog, not free text, to avoid
inconsistencies in reports.

## 5. Soft delete

No "delete" action physically removes a record. It's marked with a
`deletedAt` field (or `active = false`) and excluded from listings by
default, but kept in the database for audit and historical reporting.

## 6. Movement log

Every relevant action must generate a log entry with: user, action,
affected entity, relevant values (before/after if applicable), and
timestamp. Minimum actions to log:
- Login / logout.
- Create, edit, (soft) delete of manufacturing materials.
- Create, edit, (soft) delete of finished product.
- Sale registration.
- New user creation.

## 7. Reports

- The admin can generate reports **by date range** for:
  - Sales.
  - Inventory (stock status).
- **Automatic weekly report**: every Saturday, a PDF summarizing sales and
  inventory is generated and emailed to admins.
