import { whatsappLink } from "@delivery/core";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Abre a conversa no WhatsApp (app no celular, WhatsApp Web no computador) com a
 * mensagem já escrita. Sem telefone válido, não aparece.
 */
export function WhatsAppButton({
  phone,
  message,
  children = "WhatsApp",
  size = "default",
  className,
}: {
  phone: string | null | undefined;
  message?: string;
  children?: React.ReactNode;
  size?: "sm" | "default";
  className?: string;
}) {
  const href = whatsappLink(phone, message);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#25D366] font-medium text-[#0B3B1E] shadow-xs transition-colors hover:bg-[#1EBE5A] focus-visible:ring-[3px] focus-visible:ring-[#25D366]/40 focus-visible:outline-none",
        size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-4 text-sm",
        className,
      )}
    >
      <MessageCircle className={size === "sm" ? "size-3.5" : "size-4"} />
      {children}
    </a>
  );
}
