"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth";

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

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: `/${locale}`,
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
