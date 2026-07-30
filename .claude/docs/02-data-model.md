# Data model

Conceptual model (not the final `schema.prisma`, but it defines entities,
fields, and relationships to get there unambiguously).

## User

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| name | string | |
| email | string | unique |
| passwordHash | string | |
| role | enum(`ADMIN`, `SELLER`) | |
| city | enum(`LA_PAZ`, `SANTA_CRUZ`) | user's base city |
| active | boolean | own soft delete: deactivate instead of deleting |
| createdAt / updatedAt / deletedAt | datetime | |

## UserSettings (phase 9)

Per-user preferences, 1:1 with `User`. Not required at signup — created
on demand with defaults the first time it's read (`getOrCreateUserSettings`
in `lib/user-settings.ts`), so existing users from before this phase
don't need a data migration.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| userId | User.id | unique |
| timezone | string | IANA identifier (e.g. `America/La_Paz`). Default `America/La_Paz` — not an enum, the picker uses `Intl.supportedValuesOf("timeZone")` instead of a hand-maintained list. |
| theme | enum(`LIGHT`, `DARK`) | Default `LIGHT`. Applied as the session's initial theme (see `05-nextjs-conventions.md` "Theme"); a manual toggle still overrides it for that browser via the existing `next-themes` cookie. |
| locale | enum(`ES`, `EN`) | Default `ES`. Mapped to next-intl's route locale codes (`es`/`en`) via a small helper — kept SCREAMING_SNAKE_CASE for consistency with every other enum in this schema, not a literal lowercase route code. Applied by redirecting to the matching locale right after login if it doesn't match the current URL. |
| createdAt / updatedAt | datetime | |

Every user manages only their own settings — there's no admin-edits-
another-user's-preferences case (03-roles-permissions.md).

## Material (Manufacturing)

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| materialType | enum/string | fabric roll, elastic bands, thread, etc. Catalog editable by admin |
| color | string? | optional, only if it applies to the material |
| type | string | subtype within materialType (e.g. fabric type) |
| quantity | decimal | with an associated unit of measure (m, units, etc.) |
| unit | enum | meters, units, rolls, etc. |
| city | enum(`LA_PAZ`, `SANTA_CRUZ`) | |
| purchasePrice | decimal | purchase price recorded at creation |
| createdBy | User.id | |
| createdAt / updatedAt / deletedAt | datetime | |

## Product (Finished product)

Represents both sets and individual pieces. A set **has no stock of its
own**: its "existence" is derived from its pieces (or handled as a
container record, see note below).

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| kind | enum(`UNIT`, `SET`) | unit or set |
| description | string | |
| color | string | |
| size | string | |
| quantity | int | current stock |
| price | decimal | suggested sale price |
| city | enum(`LA_PAZ`, `SANTA_CRUZ`) | |
| setId | uuid? | if `kind = UNIT` and it belongs to a set, reference to the parent `Product` (`kind = SET`) |
| pieceRole | enum(`TOP`, `BOTTOM`, `CAP`)? | only if it belongs to a set, which piece it is |
| active | boolean | phase 9: reversible "deactivate" toggle, default `true` — separate from `deletedAt`. Deactivating (e.g. discontinued/out of production) doesn't cascade to a SET's pieces, same independent-row rule already used by delete. |
| createdBy | User.id | |
| createdAt / updatedAt / deletedAt | datetime | |

**Design note (to validate):** when a `SET` is created, N `UNIT` records
are created with `setId` pointing to the set. The `SET` record itself can
be used purely as a grouping/metadata record (set name, full-set price)
and doesn't necessarily carry its own quantity — the actual quantity lives
in the pieces. Confirm with the business whether they also need to know
"how many complete sets do I have ready to sell" as a separate number
(that would require calculation logic: the minimum across available
pieces).

## Sale

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| productId | uuid | reference to the `Product` (specific unit sold) |
| kind | enum(`UNIT`, `SET`) | denormalized copy at the time of sale |
| description / color / size | string | copied at sale time (historical, in case the product changes later) |
| quantity | int | |
| unitPrice | decimal | actual sale price (may differ from `Product.price`) |
| totalPrice | decimal | |
| city | enum | |
| saleDate | datetime | |
| saleType | enum(`CASH`, `ORDER`, `RESERVATION`) | cash / order / reservation-to-be-settled |
| paymentMethod | enum(`QR`, `CASH`) | |
| amountPaid | decimal | |
| balanceDue | decimal | calculated: totalPrice - amountPaid |
| deliveryDate | datetime? | only applies to `ORDER` |
| sellerId | User.id | who made the sale |
| customerName | string? | to confirm whether recording the customer is needed |
| customerPhone | string? | to confirm |
| notes | text? | |
| createdAt / updatedAt / deletedAt | datetime | |

## MovementLog

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| userId | User.id | |
| action | enum | `LOGIN`, `CREATE_MATERIAL`, `UPDATE_MATERIAL`, `DELETE_MATERIAL`, `CREATE_PRODUCT`, `UPDATE_PRODUCT`, `DELETE_PRODUCT`, `CREATE_SALE`, `CREATE_USER`, `CLAIM_PEDIDO`, `RELEASE_PEDIDO`, `CONVERT_PEDIDO`, `CANCEL_PEDIDO`, etc. |
| entityType | string | `Material`, `Product`, `Sale`, `User`, `PublicRequest` |
| entityId | uuid | |
| metadata | json | relevant values of the change |
| createdAt | datetime | |

`userId` is a **required** FK — there is no row for the anonymous
creation of a `PublicRequest` (see below), only for the internal
claim/release/convert/cancel actions on it, which always have a real
acting user.

## ProductStockMovement (phase 9)

A dedicated per-product stock ledger — **not** derived from
`MovementLog`. Every function in `lib/inventory.ts` that changes
`Product.quantity` writes one row per affected product/piece here, in
the same transaction as the quantity change:

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| productId | Product.id | |
| quantityBefore | int | |
| quantityAfter | int | |
| delta | int | `quantityAfter - quantityBefore` — positive = increase, negative = decrease |
| reason | enum(`CREATED`, `MANUAL_ADJUSTMENT`, `SALE`, `RETURN`, `VOID`) | |
| saleId | Sale.id? | set when `reason` is `SALE`/`RETURN`/`VOID` |
| userId | User.id | who caused the change — the creator/editor for `CREATED`/`MANUAL_ADJUSTMENT`, the seller for `SALE`, whoever reversed the sale for `RETURN`/`VOID` |
| createdAt | datetime | |

Why a dedicated table instead of filtering `MovementLog` by
`entityId`: a `SALE` already writes a `MovementLog` row scoped to the
`Sale` entity, not the `Product` — reusing that table for a per-product
view would mean either a second `entityType = Product` log per sale (a
duplicate write for the same event) or inferring "quantity before/after"
from each action's free-form `metadata` JSON, which isn't reliable
enough for something the business explicitly wants as a clear
increase/decrease ledger.

A `SET` container row never carries real stock (see the Product design
note above), so it never gets a `ProductStockMovement` row itself —
only its pieces do.

## PublicRequest (public pedido/cotización, phase 10)

Captures an anonymous order/quote request submitted from the public
landing page's product configurator (`01-business-rules.md` section
11). Deliberately **standalone**: no `productId` FK (the landing
configurator's gender/model/color/size catalog is a hardcoded
placeholder, unrelated to the real `Product` table), `city`/`size`
stay plain enum values rather than a lookup table.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| kind | enum(`ORDER`, `QUOTE`) | derived server-side from whether `size` was submitted — never trusts a client-supplied value |
| status | enum(`PENDING`, `ATTENDED`, `CONVERTED`, `CANCELLED`) | default `PENDING`; see the transition table in `01-business-rules.md` section 11 |
| customerName | string | required |
| customerPhone | string | required |
| notes | string | required — pre-filled with a summary of the landing selections, editable by the customer |
| gender | enum(`MALE`, `FEMALE`) | landing configurator's gender toggle |
| model | string | landing configurator's model key (placeholder catalog, not an enum — expected to change without a migration) |
| color | string | landing configurator's color key (same reasoning as `model`) |
| size | enum(`XS`..`XXL`)? | **null means this is a QUOTE**, present means ORDER |
| city | enum(`LA_PAZ`, `SANTA_CRUZ`) | |
| quantity | int? | ORDER-only — how many of the single item |
| estimatedQuantity | string? | QUOTE-only, free text/range |
| usageContext | string? | QUOTE-only — who it's for (clinic/company/personal) |
| desiredTimeframe | string? | QUOTE-only |
| additionalDetails | string? | QUOTE-only, open-ended "tell us what you're looking for" |
| submissionIp | string? | used for rate-limiting anonymous submissions, not displayed to end users |
| assignedSellerId | User.id? | set when a seller/admin claims it (`status` → `ATTENDED`) |
| assignedAt | datetime? | |
| convertedSaleId | Sale.id? | **plain string, not a Prisma relation** — see note below |
| createdAt / updatedAt | datetime | no `deletedAt`/`active` — `status` (including `CANCELLED`) fully covers this row's lifecycle |

**Why `assignedSellerId` is a real FK but `convertedSaleId` isn't:**
the "no relations to other tables" rule is about the *public creation
path* having zero write-time dependencies. Claiming is an internal,
authenticated action against a `User` that provably exists, so
`assignedSellerId` gets a real FK (same integrity guarantee `Sale.seller`
already has). `Sale` is the money-critical entity owned exclusively by
`lib/inventory.ts`, so `convertedSaleId` stays a plain, unenforced
string — this table can keep evolving without ever touching a `Sale`
migration; traceability is preserved via `getSaleById(convertedSaleId)`.

## Relationships (summary)

- `User` 1—1 `UserSettings`
- `User` 1—N `Sale` (seller)
- `User` 1—N `Material` / `Product` (creator, for audit purposes)
- `User` 1—N `ProductStockMovement` (who caused the change)
- `Product` 1—N `ProductStockMovement`
- `Sale` 1—N `ProductStockMovement` (only for `SALE`/`RETURN`/`VOID` rows)
- `Product (SET)` 1—N `Product (UNIT)` (set pieces, self-relation)
- `Product` 1—N `Sale`
- `User` 1—N `MovementLog`
- `User` 1—N `PublicRequest` (`assignedSellerId`, nullable — the claiming seller/admin)
- `PublicRequest` —(unenforced)→ `Sale` via `convertedSaleId` (no Prisma `@relation`, see the `PublicRequest` section above)
