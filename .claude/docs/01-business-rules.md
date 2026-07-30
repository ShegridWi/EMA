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

## 8. User preferences (phase 9)

Every user (any role) manages their own timezone, theme, and language
via `UserSettings` — never an admin editing someone else's:

- **Timezone**: defaults to `America/La_Paz` (Bolivia, UTC-4, no DST).
  Every date is **stored in UTC**; it's converted to the *viewing* or
  *acting* user's configured timezone only at the display/input
  boundary (see `05-nextjs-conventions.md` "Timezone handling"). Almost
  everyone will keep the default since the business only operates in
  Bolivia, but the setting isn't hardcoded — a dropdown lets it change.
- **Theme**: applied as the session's initial light/dark theme on
  login. A manual toggle during the session still works as before (the
  `next-themes` cookie), it just no longer starts from a fixed browser
  default.
- **Language**: applied right after login — redirects to the matching
  locale (`/es` or `/en`) if the URL doesn't already match.

## 9. Product deactivation (phase 9)

Separate from the existing soft delete (`deletedAt`, permanent-ish
removal from the catalog): `Product.active` is a **reversible** toggle
for "temporarily out of production / discontinued but might come back"
— admin-only, same role as add/edit/delete. Deactivating a `SET`
container row does **not** cascade to its pieces (same independent-row
rule as delete, 02-data-model.md).

## 10. Product stock history (phase 9)

Every change to `Product.quantity` — creation with starting stock, a
manual edit that changes the quantity, a sale, or a sale being returned/
voided — writes one `ProductStockMovement` row per affected product/
piece (02-data-model.md), recording the quantity before/after, the
delta, why, the related sale if any, and who caused it. Viewable by
both roles from the product's own row in the Finished product listing
(same visibility as viewing the product itself) — it's a read-only
history, no actions.

## 11. Public pedido/cotización requests (landing page)

The public landing page (`/`) lets an anonymous visitor — no login —
submit an order or quote request from the product configurator
(gender, model, color, size, city). This used to only build a WhatsApp
deep link with no record kept anywhere; it's now captured in the system
as a `PublicRequest` row (`02-data-model.md`) that flows into an
internal "Pedidos" admin section.

### Order vs. quote

The visitor never explicitly picks a mode — it's derived **server-side**
from whether a **size** was selected on the landing configurator:

- **Size selected → ORDER** (`kind = ORDER`): a concrete, single-item
  request. The form additionally asks for a quantity. If the customer
  wants more than one model, that's handled by a seller showing them
  the full catalog after claiming the request — this flow doesn't
  support a multi-item cart.
- **No size selected → QUOTE** (`kind = QUOTE`): a more open-ended
  inquiry. The form additionally asks for an approximate quantity
  needed, who it's for (clinic/company/personal use), a desired
  timeframe, and a free-text "tell us what you're looking for" field —
  all optional.

A client-supplied `kind` value is never trusted (see
`05-nextjs-conventions.md`'s note on `lib/validations/pedido.ts`) —
trusting it would let a tampered form submission misclassify itself.

### Required vs. optional fields

Customer name, phone, and a description (`notes`) are **always
required** — validated both client- and server-side. The description
is **pre-filled** with a summary of the landing selections (e.g. "Pijama
médico para mujer, modelo Clásico, color Azul marino, talla M.") that
the customer can freely edit; the form tells them to review/complete it
since it's what the seller reads to understand the request. The 4
quote-specific fields above are optional in both directions (the
customer can leave them blank, and a request with a size still doesn't
show them at all).

### Anti-abuse (anonymous, no login)

Since this is the first form in the app anyone can submit without an
account, it's rate-limited by submission IP (a short burst limit and a
looser daily cap) and protected by a hidden honeypot field — see
`05-nextjs-conventions.md` for the concrete mechanism. Both were chosen
specifically to avoid a new paid dependency (CLAUDE.md section 1).

### Status lifecycle

```
PENDING   -> ATTENDED   (a seller/admin claims it)
ATTENDED  -> PENDING    (admin releases a mis-claim)
ATTENDED  -> CONVERTED  (a Sale is generated from it)
PENDING/ATTENDED -> CANCELLED (spam, unreachable customer, etc.)
```
`CONVERTED` and `CANCELLED` are terminal — no code path transitions out
of either.

### Claiming ("atender")

**First-come, first-served**: any eligible seller can claim a `PENDING`
request, and whoever clicks first gets it assigned directly to them —
there's no queue/dispatch step. A seller only sees and can claim
requests matching **their own city**; an admin sees and can claim/
manage every city's requests (see `03-roles-permissions.md`). Claiming
does **not** deduct stock or create any financial record by itself —
only converting to a sale does.

### Converting to a sale

From a claimed (`ATTENDED`) request, the assigned seller (or an admin)
generates a real `Sale` — this reuses the exact same sale-creation flow
and stock-deduction logic as a normal walk-in sale (`lib/inventory.ts`'s
`createSale`, section 3 above), pre-filled with the request's customer
name/phone/notes/quantity. **A real product must still be picked from
the actual catalog** at this step: the request's color/size are strings
from the landing page's own placeholder catalog, not guaranteed to
match a real `Product`'s free-text color. Once converted, the request's
status becomes `CONVERTED` and it's linked to the resulting sale.

### Admin notification

The dashboard header shows a bell with the count of pending requests
(scoped the same way as claiming — a seller's own city, or every city
for an admin), with a dropdown listing them by customer/type/city/date.
Clicking one opens that request's detail page and dismisses it from
*that person's own* notification list going forward — this is a
per-browser "already looked at it" marker, not a status change, so the
request still shows up for every other eligible seller/admin until it's
actually claimed, converted, or cancelled.
