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
2. **Set as an entity**: does the business need to see "I have 5 complete
   sets available" as a direct number, or is it enough to see each piece's
   stock separately and calculate the minimum mentally? This changes
   whether a calculated field or an aggregated view is needed.
3. **Seller and city**: is a seller fixed to one city (La Paz or Santa
   Cruz), or can they sell/view inventory for both? Affects the `User.city`
   model and default filters.
4. **Customer data on the sale**: does the customer's name/phone need to be
   recorded, even optionally, especially for orders and reservations (to
   be able to contact them when ready)? Recommended: yes, at least as
   optional fields.
5. **Material and color catalog**: are material types and colors a fixed
   predefined catalog, or should the admin be able to freely add new
   options from the UI? Recommended: catalog editable by admin, not
   hardcoded.
6. **Sizes**: is there a fixed set of sizes (S, M, L, XL...) or is it free
   text? Recommended: fixed catalog to avoid inconsistencies in
   reports/search.
7. **Weekly report email**: which address(es) does it go to? All
   registered admins, or one fixed business mailbox?

Resolved:

- ~~**Supported languages**~~ — confirmed: **Spanish (default) + English**
  for the MVP. See `CLAUDE.md` section 5.

None of these block starting the project (they were modeled with
reasonable defaults), but they should be resolved before building the
Sales and Reports screens, which are the most sensitive to these details.
