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
| action | enum | `LOGIN`, `CREATE_MATERIAL`, `UPDATE_MATERIAL`, `DELETE_MATERIAL`, `CREATE_PRODUCT`, `UPDATE_PRODUCT`, `DELETE_PRODUCT`, `CREATE_SALE`, `CREATE_USER`, etc. |
| entityType | string | `Material`, `Product`, `Sale`, `User` |
| entityId | uuid | |
| metadata | json | relevant values of the change |
| createdAt | datetime | |

## Relationships (summary)

- `User` 1—N `Sale` (seller)
- `User` 1—N `Material` / `Product` (creator, for audit purposes)
- `Product (SET)` 1—N `Product (UNIT)` (set pieces, self-relation)
- `Product` 1—N `Sale`
- `User` 1—N `MovementLog`
