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

## Implementation notes

- Role validation must **always happen server-side** (Server Action / API
  route), never just by hiding buttons in the UI. The UI hides for
  usability; the backend rejects for security.
- By default, a seller should only see the sales and inventory of **their
  own city** (to confirm with the business whether a seller can operate in
  both cities or is fixed to one).
- Consider a third role in the future (`SUPER_ADMIN` or business owner) if
  a distinction is needed between "branch admin" vs. "owner with global
  visibility" — not in the current scope, but the enum-based role model
  allows adding it without breaking anything.
