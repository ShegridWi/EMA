# .claude/

This folder contains the project context that Claude Code (and any new
developer) should read before working on the system.

- The root `CLAUDE.md` file (outside this folder, at the repo root) is the
  executive summary — always loaded first.
- `docs/` contains the detail: business rules, data model, roles, and
  scope. They're referenced from `CLAUDE.md` to avoid duplicating
  information.
- `skills/` contains project-specific Claude Code skills for recurring
  workflows in this codebase.

All files in this folder are written in **English**, regardless of the
end-user languages the application supports (Spanish default + English —
see `CLAUDE.md` section 5).

## When to update this

- If a business rule changes (e.g. how set sales work), update
  `docs/01-business-rules.md` **before** touching code.
- If a field or entity is added/changed, update `docs/02-data-model.md` in
  the same PR as the Prisma migration.
- Assumptions in `docs/04-scope-mvp.md` that get confirmed with the
  business should move to `01-business-rules.md` as a definitive rule, and
  be removed from the pending list.
