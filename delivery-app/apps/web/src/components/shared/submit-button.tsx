"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** Botão de formulário que trava enquanto a ação roda (evita clique duplo). */
export function SubmitButton({
  children,
  pendingText = "Aguarde...",
  ...props
}: React.ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}
