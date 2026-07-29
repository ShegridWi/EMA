# EMA — Euforia Moda Administrator

Inventory control and sales system for Euforia Moda, a family
medical-scrubs manufacturing business (La Paz / Santa Cruz, Bolivia). See
`CLAUDE.md` and `.claude/docs/` for full business context, data model, and
conventions.

## Stack

Next.js (App Router) + TypeScript, Tailwind CSS, Prisma + PostgreSQL,
Auth.js, Zod, next-intl, next-themes. Full list in `CLAUDE.md` section 2.

## Getting started

1. Check you have everything installed: `npm run check:env`
2. Install dependencies: `npm install`
3. Start local PostgreSQL: `docker compose up -d`
4. Copy env vars: `cp .env.example .env` (already pre-filled to match
   `docker-compose.yml`; only the SMTP block needs real values)
5. Generate the Prisma client: `npx prisma generate`
6. Run the dev server: `npm run dev` — http://localhost:3000

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Run Vitest |
| `npm run check:env` | Verify local tooling (Node, npm, git, Docker) |
| `npx prisma studio` | Browse the local database |
| `npx prisma migrate dev` | Create/apply a migration after editing `prisma/schema.prisma` |
| `docker compose down` | Stop the local PostgreSQL container |

## Project context for Claude / contributors

- `CLAUDE.md` — entry point, stack, business summary, roles, dev
  conventions.
- `.claude/docs/` — business rules, data model, roles/permissions, MVP
  scope and open assumptions, Next.js conventions.
- `AGENTS.md` — points coding agents at the version-matched Next.js docs
  bundled in `node_modules/next/dist/docs/`.
