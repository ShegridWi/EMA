# MVP scope and open assumptions

## MVP (first functional version)

1. Login with roles (admin / seller).
2. Manufacturing CRUD (only admin writes, both read/search).
3. Finished product CRUD, with set → automatic pieces logic (only admin
   writes, both read).
4. Sale registration (unit or set, cash / order / reservation, QR or cash)
   with automatic stock deduction.
5. User registration and management (admin only).
6. Movement log (visible to admin only).
7. Manual report by date range (sales and inventory).
8. Automatic weekly report by email (Saturdays, PDF).
9. Responsive, dark/light theme, language support (Spanish default +
   English).
10. Soft delete on every entity.

## Phase 9 — first post-MVP improvement round (in progress)

The MVP above shipped in full with `feature/reports` (phase 8). These
items were requested directly by the business afterward — see
`.prompts/09-system-improvements.md` for the sub-phase breakdown
(`feature/user-settings`, `feature/timezone-utc`,
`feature/inventory-filters`, `feature/product-deactivate`,
`feature/product-stock-history`):

- Per-user settings (timezone, theme, language) — `UserSettings`,
  `01-business-rules.md` section 8.
- Dates stored in UTC, displayed in the viewing user's configured
  timezone (`America/La_Paz` by default) — `05-nextjs-conventions.md`
  "Timezone handling".
- Better filters on Materials (date range) and Finished product (size,
  date range).
- Per-product stock movement history — `ProductStockMovement`,
  `01-business-rules.md` section 10.
- Reversible product deactivation + an active/inactive tab, same
  pattern as user deactivation (phase 6).

## Phase 10 — public pedido/cotización requests + admin "Pedidos" section

Also requested directly by the business, independent of phase 9: the
landing page's quote button used to only build a WhatsApp deep link
with nothing kept in the system. Now every order/quote request
submitted from the public landing page (no login) is captured as a
`PublicRequest` row (`02-data-model.md`) and flows into an internal
"Pedidos" section where a seller claims it and converts it into a real
`Sale` — see `01-business-rules.md` section 11 for the full business
flow and `05-nextjs-conventions.md` for the implementation (anonymous
Server Action, rate limiting, notification dropdown).

Resolved for this phase:

- **Order vs. quote as one form**: no separate pages/flows — derived
  from whether a size was picked on the landing configurator, not an
  explicit choice the visitor makes.
- **Anti-abuse**: IP-based rate limiting (short burst + daily cap) plus
  a honeypot field, no paid captcha/Redis service — consistent with
  CLAUDE.md section 1 (avoid unnecessary recurring costs).
- **Seller city-scoping for claiming**: confirmed — a seller only sees/
  claims requests from their own city; an admin sees/manages all
  cities. See `03-roles-permissions.md`.
- **Claim model**: first-come, first-served — no dispatch/assignment
  queue, whoever clicks "atender" first on a pending request gets it.
- **Notification mechanism**: a header bell with a dropdown list of
  pending requests, refreshed by a periodic client poll (not
  websockets/push) — matches the "simple, low-maintenance" project
  philosophy for a low-traffic internal tool.

Out of scope for this phase (revisit only if the business asks):

- A multi-item cart on the public request form (a seller handles
  additional models by showing the customer the catalog after
  claiming).
- Any paid anti-spam/captcha service.
- Server-persisted "seen/unseen" notification state — dismissing a
  notification is a per-browser convenience (`localStorage`), not a
  database column, so it doesn't survive switching browsers/devices.

## Out of MVP scope (phase 2 / future)

- Multi-branch beyond the 2 fixed cities (dynamic city/branch catalog).
- Customer management as its own entity (purchase history per customer,
  loyalty).
- Push notifications / automatic reminders for pending order and
  reservation balances.
- Dashboard with advanced metrics (stock turnover, best-selling product,
  projections).
- Real integration with a QR payment gateway (for now it's just showing
  the QR image, no automatic reconciliation).
- Native mobile app (responsive web covers this for now).

## Assumptions that need to be confirmed with the business before implementing

These are points where a reasonable decision was made to move forward, but
**they aren't 100% defined in the original brief** and are worth
validating:

3. **Seller and city**: is a seller fixed to one city (La Paz or Santa
   Cruz), or can they sell/view inventory for both? Affects the `User.city`
   model and default filters.

Resolved:

- ~~**Supported languages**~~ — confirmed: **Spanish (default) + English**
  for the MVP. See `CLAUDE.md` section 5.
- ~~**Material and color catalog**~~ — decided for `feature/db-schema`:
  `Material.materialType` and `Material.color` are free `String` fields for
  now (not an editable catalog table), to avoid blocking the schema on an
  extra CRUD module this early. **Still pending business confirmation** —
  revisit if inconsistent free-text values become a real problem in
  reports/search; migrating to a catalog table later is possible without
  losing existing data (`materialType`/`color` values become seed rows).
- ~~**Sizes**~~ — confirmed: fixed catalog, modeled as `enum Size { XS S M
  L XL XXL }` in `prisma/schema.prisma`.
- ~~**Set as an entity**~~ — decided for `feature/products-crud`: show
  each piece's stock separately; no computed "N complete sets available"
  number for now. Revisit if the business asks for that aggregate later
  (it would be a calculated field: min across the set's pieces, not a
  stored value).
- ~~**Order vs. Reservation**~~ — confirmed for `feature/sales`: these are
  two distinct flows, kept as separate `SaleType` enum values (`ORDER`,
  `RESERVATION`) exactly as modeled in `prisma/schema.prisma`. `ORDER` is
  a large/custom sale with an estimated delivery date; `RESERVATION` is a
  partial payment with a pending balance, not necessarily a large order.
- ~~**Customer data on the sale**~~ — confirmed for `feature/sales`:
  `customerName`/`customerPhone` are collected as optional fields on the
  sale form (all sale types, not just orders/reservations), matching the
  nullable fields already in the `Sale` model.
- ~~**Currency**~~ — decided for `feature/sales`: the business operates in
  **Bolivianos (BOB)** by default. `lib/currency.ts` defines `Currency`
  (`BOB` | `USD`) and `formatCurrency()`, used in list views (Materials,
  Products, Sales) to render amounts as `Bs 150.00`. No form collects a
  currency choice yet — every amount is assumed BOB. Revisit if the
  business ever needs to record a sale/price in USD; that would need a
  `currency` column added to `Material`/`Product`/`Sale` plus a form
  field, not just a display change.
- ~~**Weekly report email**~~ — decided for `feature/reports`: sent to
  **every active admin** (`role = ADMIN`, `active = true`), queried
  dynamically at send time — not a fixed mailbox. Stays correct on its
  own as admins are added/deactivated, no env var to maintain.

None of these block starting the project (they were modeled with
reasonable defaults), but they should be resolved before building the
Sales and Reports screens, which are the most sensitive to these details.
