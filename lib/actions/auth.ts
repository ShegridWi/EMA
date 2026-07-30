"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";
import { LOCALE_TO_ROUTE } from "@/lib/locale";

export type LoginActionState = {
  success: false;
  error: "invalid_input" | "invalid_credentials";
} | null;

export async function loginAction(
  locale: string,
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: "invalid_input" };
  }

  // Read-only lookup, on purpose — this must never write anything before
  // the password is actually verified (that happens inside signIn()
  // below). If the email doesn't exist or has no settings yet, this
  // just falls back to whatever locale the login page itself was on.
  // Applies the resolved assumption from 01-business-rules.md section 8:
  // language is redirected to the user's saved preference at login.
  const targetUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { settings: { select: { locale: true } } },
  });
  const preferredLocale = targetUser?.settings
    ? LOCALE_TO_ROUTE[targetUser.settings.locale]
    : locale;

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: `/${preferredLocale}/dashboard`,
    });
  } catch (error) {
    // next-auth's signIn() throws a NEXT_REDIRECT signal on success —
    // only AuthError (e.g. CredentialsSignin) means the login itself failed.
    if (error instanceof AuthError) {
      return { success: false, error: "invalid_credentials" };
    }
    throw error;
  }

  return null;
}
