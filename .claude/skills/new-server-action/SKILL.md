---
name: new-server-action
description: Scaffold a new Server Action for this project following its mandatory pattern — server-side role check, Zod validation, a centralized mutation function, and a typed result. Use whenever adding a new data-mutating action (create/update/delete on materials, products, sales, users).
---

# new-server-action

This project requires every data mutation to go through a Server Action
built the same way (see `.claude/docs/05-nextjs-conventions.md` and
`CLAUDE.md` section 7). This skill scaffolds that shape so it's never
accidentally skipped or reinvented per-file.

## Inputs to gather from the user (ask if not given in `args`)

- **Module**: which domain the action belongs to (`materials`, `products`,
  `sales`, `users`, ...). Maps to `lib/actions/<module>.ts` and
  `lib/validations/<module>.ts`.
- **Action name**: verb + entity, e.g. `createMaterial`,
  `updateProductPrice`, `deleteSale`.
- **Required role**: `ADMIN`, `SELLER`, or "either" (both roles allowed —
  still requires a valid session).
- **Does it mutate inventory quantities?** If yes, it must call a
  centralized function in `lib/inventory.ts` (create one if it doesn't
  exist yet) instead of touching Prisma stock fields directly — this is a
  hard project rule, not optional.
- **Does it touch money** (price, payment, balance)? If yes, remind the
  user a test is required before merging (`CLAUDE.md` section 7) and
  offer to scaffold a matching Vitest file under `tests/`.

## Steps

1. Check whether `lib/actions/<module>.ts` and
   `lib/validations/<module>.ts` already exist. If not, create them (and
   the `lib/` folder itself, if the Next.js app hasn't been scaffolded
   yet — in that case tell the user this action file is ready to drop in
   once `create-next-app` has run, don't try to run Next.js commands
   yourself unless asked).
2. Add (or extend) the Zod schema in `lib/validations/<module>.ts` for the
   action's input shape.
3. Add the Server Action in `lib/actions/<module>.ts` following this exact
   shape:

```ts
"use server";

import { auth } from "@/lib/auth";
import { <actionName>Schema } from "@/lib/validations/<module>";
// import the centralized mutation function, e.g.:
// import { <mutationFn> } from "@/lib/inventory";

export async function <actionName>Action(input: unknown) {
  const session = await auth();
  if (/* role check per the gathered "required role" */) {
    return { success: false as const, error: "Forbidden" };
  }

  const parsed = <actionName>Schema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  const result = await <mutationFn>(parsed.data, session.user.id);
  return { success: true as const, data: result };
}
```

4. If it mutates inventory, make sure `<mutationFn>` in `lib/inventory.ts`
   wraps the Prisma write and the `MovementLog` insert in a single
   `prisma.$transaction` — write that function if it doesn't exist yet.
5. If it touches money and the user agreed to a test, scaffold a Vitest
   file at `tests/<module>.test.ts` covering the calculation/mutation
   logic (not just a smoke test).
6. Show the user a summary of the files created/changed — don't run
   `npm install` or start the dev server unless asked.
