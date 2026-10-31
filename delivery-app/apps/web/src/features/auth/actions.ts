"use server";

import { courierSignupSchema, registerSchema } from "@delivery/validators";
import type { z } from "zod";
import { HttpError } from "@/lib/api";
import { signIn } from "@/lib/auth";
import { registerCourier, registerCustomer } from "./register";

/** Estado do formulário: erros por campo e os valores digitados (menos a senha). */
export type SignupState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

function formValues(form: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  form.forEach((value, key) => {
    if (key !== "password" && !key.startsWith("$") && typeof value === "string") values[key] = value;
  });
  return values;
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

async function signup<T extends { email: string; password: string }>(
  form: FormData,
  schema: z.ZodType<T>,
  create: (input: T) => Promise<unknown>,
  redirectTo: string,
): Promise<SignupState> {
  const values = formValues(form);
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { values, fieldErrors: fieldErrors(parsed.error), error: "Confira os campos destacados." };

  try {
    await create(parsed.data);
  } catch (error) {
    if (error instanceof HttpError) return { values, error: error.message };
    throw error;
  }
  // Entra direto na conta nova (lança o redirect para `redirectTo`).
  await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirectTo });
  return {};
}

export async function registerCustomerAction(_prev: SignupState, form: FormData): Promise<SignupState> {
  return signup(form, registerSchema, registerCustomer, "/");
}

export async function registerCourierAction(_prev: SignupState, form: FormData): Promise<SignupState> {
  return signup(form, courierSignupSchema, registerCourier, "/courier");
}
