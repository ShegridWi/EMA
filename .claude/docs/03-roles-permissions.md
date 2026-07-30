# Roles and permissions

Two roles: **Admin** and **Seller**.

## Matrix by page / module

| Module | Action | Seller | Admin |
|---|---|:---:|:---:|
| Home / Login | Sign in | ✅ | ✅ |
| Inventory — Manufacturing | View / search | ✅ | ✅ |
| Inventory — Manufacturing | Add / edit / delete | ❌ | ✅ |
| Inventory — Finished product | View / search | ✅ | ✅ |
| Inventory — Finished product | Add / edit / delete | ❌ | ✅ |
| Sales | Register sale | ✅ | ✅ |
| Sales | View own history | ✅ | ✅ |
| Sales | View all sellers' history | ❌ | ✅ |
| Reports | Generate report by date (sales / inventory) | ❌ | ✅ |
| Reports | Receive weekly report by email | ❌ | ✅ |
| Users | Register new admins / sellers | ❌ | ✅ |
| Users | Edit / deactivate users | ❌ | ✅ |
| Movement log | View | ❌ | ✅ |
| Settings (phase 9) | Edit own timezone / theme / language | ✅ | ✅ |
| Inventory — Finished product | Deactivate / reactivate (phase 9) | ❌ | ✅ |
| Inventory — Finished product | View a product's stock history (phase 9) | ✅ | ✅ |
| Pedidos (phase 10) | View / claim (atender) pending requests | own city only | all cities |
| Pedidos (phase 10) | Cancel a request | only if assigned to them | any |
| Pedidos (phase 10) | Release ("liberar") a claimed request back to pending | ❌ | ✅ |
| Pedidos (phase 10) | Generate a sale from a claimed request | only if assigned to them | any |
| Pedidos (phase 10) | See the pending-requests notification bell | own city's count | all cities' count |
| Sales (phase 11) | View a sale's own detail page | own sales only | any sale |
| Sales (phase 11) | Receive a notification when any sale is registered | ❌ | ✅ |

## Implementation notes

- Role validation must **always happen server-side** (Server Action / API
  route), never just by hiding buttons in the UI. The UI hides for
  usability; the backend rejects for security.
- By default, a seller should only see the sales and inventory of **their
  own city** (to confirm with the business whether a seller can operate in
  both cities or is fixed to one).
- **Pedidos specifically**: confirmed with the business (unlike the
  still-open Sales/inventory assumption above) — a seller only sees and
  can claim/manage requests matching `User.city`; an admin isn't
  city-restricted for this module. See `01-business-rules.md` section
  11 and `04-scope-mvp.md`.
- Consider a third role in the future (`SUPER_ADMIN` or business owner) if
  a distinction is needed between "branch admin" vs. "owner with global
  visibility" — not in the current scope, but the enum-based role model
  allows adding it without breaking anything.
