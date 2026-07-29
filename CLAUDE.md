# CLAUDE.md

@AGENTS.md

This file is the entry-point context for Claude (and for any developer)
about this project. Detailed documentation lives in `.claude/docs/`.

> **Language note**: all project instructions and documentation (this file,
> `.claude/README.md`, `.claude/docs/*.md`) are written in English. The
> **application itself** must support **Spanish (default) and English** as
> end-user languages — see section 5.

## 1. What this project is

**EMA (Euforia Moda Administrator)** is an **inventory control and
management system** for **Euforia Moda**, a family business that
**manufactures and sells medical scrubs**. The business sells both raw
materials converted into finished product and individual pieces of that
product.

This is not a public e-commerce site: it's an **internal tool** for admins
and sellers to control materials, finished-product stock, and sales, across
two cities (La Paz and Santa Cruz, Bolivia).

This project is designed for a **small business with limited resources**,
therefore:
- Prefer simple, low-maintenance solutions over complex architectures.
- Avoid dependencies/services that generate unnecessary recurring costs.
- The code must be maintainable by a small team (possibly a single dev).

## 2. Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | Auth.js (NextAuth) with roles |
| Validation | Zod (server-side, on every Server Action input) |
| i18n | next-intl — Spanish (default) + English |
| Theme | Tailwind `class` strategy + `next-themes` |
| Testing | Vitest (unit) — required for anything touching money |
| Package manager | npm (default; no extra global tooling required) |
| Hosting | DigitalOcean App Platform + Managed PostgreSQL |
| Email delivery | Nodemailer + transactional SMTP provider (see `04-scope-mvp.md`) |
| PDF generation | `@react-pdf/renderer` (pure JS, no headless browser needed) |

See full decisions and rationale in the project conversation history / the
technical README (to be added once scaffolding happens). Full Next.js/TS
conventions live in `.claude/docs/05-nextjs-conventions.md`.

## 3. Business context (summary)

- The business **manufactures** the scrubs from **materials** (fabric rolls,
  elastic bands, thread, etc.) — this is the *manufacturing inventory*.
- The finished product is a **medical scrub**, which can be sold:
  - As a **set** (2 or 3 pieces: top + pants/bottom + optional cap).
  - As an **individual piece** (e.g. only the top).
- When a new set is registered, the system must **automatically generate
  the individual record for each piece** (at 0 or at the quantity
  provided), so stock can be controlled if a loose piece of the set is
  sold.
- They operate in two cities: **La Paz** and **Santa Cruz**. Inventory and
  sales are segmented by city.
- Every "delete" in the system is a **soft delete** (a record is never
  physically removed).

## 4. Roles

Two roles: **Admin** and **Seller**. See the full matrix in
`.claude/docs/03-roles-permissions.md`.

## 5. Cross-cutting requirements (apply to the whole system)

- **Responsive** on every page.
- **Light / dark theme**.
- **Language support (i18n)** for end users — **Spanish (default) and
  English**.
- **Soft delete** on every deletable entity.
- **Audit log**: every relevant action (sale, inventory create/edit, login,
  user changes) must be recorded with user + timestamp + action.
- **Automatic weekly report**: every Saturday, email a PDF with sales and
  inventory to admins.

## 6. How to navigate the documentation

- `.claude/docs/01-business-rules.md` — business rules and flows (sale,
  reservations, orders, sets vs. pieces).
- `.claude/docs/02-data-model.md` — entities, fields, relationships.
- `.claude/docs/03-roles-permissions.md` — what each role can do, page by
  page.
- `.claude/docs/04-scope-mvp.md` — what's in the MVP, what's deferred, and
  **assumptions that must be confirmed with the business** before
  implementing.
- `.claude/docs/05-nextjs-conventions.md` — Next.js/TypeScript conventions:
  folder structure, Server Actions pattern, validation, testing, tooling.

## 7. Development conventions (always follow)

- Strict TypeScript, no `any` without an explicit justification.
- Every data mutation goes through Server Actions or API routes with
  server-side role validation (never rely solely on hiding UI elements).
- All inventory quantities are modified through centralized functions that
  also write the movement log — never a direct update to the stock table
  bypassing that layer.
- Any feature that touches money (sales, partial payments, balances) must
  have tests before merging.
- Full conventions (folder structure, Server Actions pattern, i18n setup,
  tooling) are in `.claude/docs/05-nextjs-conventions.md`.
