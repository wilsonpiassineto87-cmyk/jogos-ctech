import { cn } from "@/lib/utils";

export function FormField({ label, className, ...props }: React.ComponentProps<"input"> & { label: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input
        className={cn(
          "h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          className,
        )}
        {...props}
      />
    </label>
  );
}
