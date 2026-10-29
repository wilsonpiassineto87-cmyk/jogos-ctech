import "server-only";
import { InvalidTransitionError } from "@delivery/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { HttpError } from "./api";

/**
 * Executa uma Server Action de formulário. Erros esperados (pedido que mudou de status,
 * corrida já aceita, PIN errado...) voltam como ?error=... na própria tela, em vez de
 * derrubarem a página com "Application error". Erros inesperados seguem para o error.tsx.
 */
export async function runAction(path: string, fn: () => Promise<void>, onSuccess = path): Promise<never> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof HttpError) redirect(`${path}?error=${encodeURIComponent(error.message)}`);
    if (error instanceof InvalidTransitionError) {
      redirect(`${path}?error=${encodeURIComponent("Esse pedido já mudou de status. A tela foi atualizada.")}`);
    }
    throw error;
  }
  revalidatePath(path);
  redirect(onSuccess);
}
