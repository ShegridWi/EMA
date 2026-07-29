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

1. **Order vs. Reservation**: are these two distinct sale types (`ORDER`
   with a delivery date vs. `RESERVATION` with a partial payment) or the
   same concept under different names? Currently modeled as two separate
   enums but with overlapping fields (`amountPaid`, `balanceDue`).
3. **Seller and city**: is a seller fixed to one city (La Paz or Santa
   Cruz), or can they sell/view inventory for both? Affects the `User.city`
   model and default filters.
4. **Customer data on the sale**: does the customer's name/phone need to be
   recorded, even optionally, especially for orders and reservations (to
   be able to contact them when ready)? Recommended: yes, at least as
   optional fields.
7. **Weekly report email**: which address(es) does it go to? All
   registered admins, or one fixed business mailbox?

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

None of these block starting the project (they were modeled with
reasonable defaults), but they should be resolved before building the
Sales and Reports screens, which are the most sensitive to these details.
