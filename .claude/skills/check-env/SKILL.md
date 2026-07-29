---
name: check-env
description: Verify the local machine has the tooling this project needs (Node.js, npm, git, and optionally psql/Docker) before running or scaffolding the Next.js + TypeScript + Prisma + PostgreSQL stack.
---

# check-env

Run the project's environment verification script and report the result to
the user in plain language.

## Steps

1. Run `node scripts/check-env.mjs` from the project root.
2. Summarize the output for the user:
   - List anything marked ❌ (required and missing) first, with a one-line
     instruction on how to install it (the script's own note already has
     this — just relay it).
   - Then list anything marked ⚠️ (optional) briefly, without pushing the
     user to install it unless they ask.
   - If everything is ✅, say so in one line — don't repeat the full table
     back verbatim.
3. If the script exits non-zero (a required tool is missing), do not
   proceed with scaffolding or `npm install`/`npx create-next-app` until
   the user has addressed it or explicitly says to continue anyway.
4. If new required tooling gets added to the project later (e.g. a second
   language runtime), update `scripts/check-env.mjs` to check for it too —
   keep the script and this skill in sync.
