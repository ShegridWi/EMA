import type { DefaultSession } from "next-auth";
import type { Role, City } from "@/app/generated/prisma/enums";

declare module "next-auth" {
  interface User {
    role: Role;
    city: City;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      city: City;
    } & DefaultSession["user"];
  }
}

// Note: NOT augmenting "next-auth/jwt" here — the `JWT` interface it
// re-exports actually lives in the (nested, non-hoisted) `@auth/core`
// package, so augmenting the "next-auth/jwt" specifier doesn't merge with
// it. `token` fields are cast explicitly instead where they're read (see
// lib/auth.ts).
