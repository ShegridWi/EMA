---
name: nextjs-architecture-review
description: Review Next.js App Router code (pages, Server Actions, data fetching) in this project against its specific architecture rules — server/client boundary, the mandatory Server Action shape, centralized inventory mutations, audit logging, and i18n. Use after writing or before merging any App Router page, layout, or Server Action.
---

# nextjs-architecture-review

This project has a small, fixed set of architecture rules (see `CLAUDE.md`
section 7 and `.claude/docs/05-nextjs-conventions.md`) that matter more
than generic Next.js best practices, because they encode business-critical
guarantees (soft delete, audit trail, role enforcement). Generic "Next.js
expert" advice from the wider ecosystem is fine for style, but this skill
checks the rules that are actually load-bearing for this codebase.

## What to check, in order

1. **Server/Client boundary**
   - Is `"use client"` only present where real interactivity is needed
     (forms, modals, local state)? Flag Client Components that could be
     Server Components (no hooks, no event handlers, no browser APIs).
   - Is data fetching done directly in Server Components via Prisma,
     rather than a client-side `fetch` to an API route for something that
     could render server-side?

2. **Server Actions — the mandatory shape** (see
   `.claude/docs/05-nextjs-conventions.md`, "Server Actions" section).
   Every action must, in order:
   - Start with `"use server"`.
   - Call `auth()` and check `session.user.role` **before** touching
     input — reject with `{ success: false, error: "Forbidden" }` if the
     role doesn't match what the action requires. Flag anything that
     only checks role in the UI (e.g. a hidden button) without a matching
     server-side check.
   - Validate input with a Zod schema from `lib/validations/` — flag any
     action trusting raw `input` without `safeParse`.
   - Delegate the actual mutation to a centralized function
     (`lib/inventory.ts` for anything touching `Material`/`Product`
     quantities) instead of calling `prisma.material.update` /
     `prisma.product.update` directly from inside the action. This is a
     hard rule from `CLAUDE.md` section 7 — flag every direct stock write
     found outside that layer.
   - Return a typed `{ success, data | error }` result, not a thrown
     error, for expected validation/permission failures.

3. **Audit logging**
   - Does every write path that's supposed to be logged (login, material
     create/edit/delete, product create/edit/delete, sale, user create —
     see `.claude/docs/01-business-rules.md` section 6) actually insert a
     `MovementLog` row in the same transaction as the mutation? Flag any
     centralized mutation function missing the `prisma.$transaction`
     wrapping the write + the log insert.

4. **Soft delete**
   - Do "delete" actions set `deletedAt`/`active = false` instead of
     calling `.delete()`? Flag any hard delete on a business entity.
   - Do list queries exclude soft-deleted rows by default (`where:
     { deletedAt: null }` or equivalent)?

5. **i18n**
   - Are user-facing strings pulled from `next-intl` translation
     functions rather than hardcoded, including error messages returned
     by Server Actions? Flag hardcoded Spanish or English UI strings.

6. **Money-touching features**
   - If the change touches price, payment, or balance calculations, is
     there a Vitest test covering it? Per `CLAUDE.md` section 7 this is
     required before merging, not optional polish.

## Output

Report findings grouped by the six checks above, most severe first
(missing server-side role check > direct stock mutation bypassing the
centralized layer / missing audit log > missing soft delete > missing
test for money code > i18n/style nits). For each finding, name the file
and line, and state the concrete rule it violates (cite the section in
`CLAUDE.md` or the relevant doc) rather than generic Next.js advice.
