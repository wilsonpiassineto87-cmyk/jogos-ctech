"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerCourierAction, registerCustomerAction, type SignupState } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const inputClass =
  "h-11 w-full rounded-xl border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-[invalid=true]:border-destructive";

function Field({
  label,
  name,
  state,
  hint,
  ...props
}: React.ComponentProps<"input"> & { label: string; name: string; state: SignupState; hint?: string }) {
  const error = state.fieldErrors?.[name];
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input
        name={name}
        defaultValue={state.values?.[name]}
        aria-invalid={error ? true : undefined}
        className={inputClass}
        {...props}
      />
      {error ? (
        <span className="text-xs font-normal text-destructive">{error}</span>
      ) : (
        hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>
      )}
    </label>
  );
}

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Criando sua conta..." : children}
    </Button>
  );
}

function CommonFields({ state }: { state: SignupState }) {
  return (
    <>
      <Field label="Nome completo" name="name" autoComplete="name" required state={state} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" required state={state} />
      <Field
        label="Celular (WhatsApp)"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="(11) 99999-0000"
        required
        state={state}
        hint="Usado só para falar sobre os seus pedidos."
      />
      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        state={state}
        hint="Pelo menos 8 caracteres."
      />
    </>
  );
}

function FormError({ state }: { state: SignupState }) {
  return state.error ? (
    <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
      {state.error}
    </p>
  ) : null;
}

export function CustomerSignupForm() {
  const [state, action] = useActionState(registerCustomerAction, {});
  return (
    <form action={action} className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Criar conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Peça seu sorvete em poucos cliques.</p>
      </div>
      <FormError state={state} />
      <CommonFields state={state} />
      <Submit>Criar conta</Submit>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
      <p className="border-t pt-4 text-center text-sm text-muted-foreground">
        Quer fazer entregas para a gente?{" "}
        <Link href="/register/courier" className="font-medium text-primary hover:underline">
          Cadastre-se como entregador
        </Link>
      </p>
    </form>
  );
}

const VEHICLES = [
  { value: "MOTORCYCLE", label: "Moto" },
  { value: "BICYCLE", label: "Bicicleta" },
  { value: "CAR", label: "Carro" },
  { value: "ON_FOOT", label: "A pé" },
];

export function CourierSignupForm() {
  const [state, action] = useActionState(registerCourierAction, {});
  const vehicleError = state.fieldErrors?.vehicleType;
  return (
    <form action={action} className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Seja entregador</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preencha seus dados. Depois que a loja aprovar o cadastro, você já pode receber corridas.
        </p>
      </div>
      <FormError state={state} />
      <CommonFields state={state} />
      <Field label="CPF" name="taxId" inputMode="numeric" placeholder="000.000.000-00" required state={state} />
      <fieldset className="grid gap-1.5 text-sm font-medium">
        <legend className="mb-1.5">Veículo</legend>
        <div className="grid grid-cols-2 gap-2">
          {VEHICLES.map((v) => (
            <label
              key={v.value}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 font-normal has-[:checked]:border-primary has-[:checked]:bg-accent",
                vehicleError && "border-destructive",
              )}
            >
              <input
                type="radio"
                name="vehicleType"
                value={v.value}
                defaultChecked={(state.values?.vehicleType ?? "MOTORCYCLE") === v.value}
                className="accent-[var(--primary)]"
              />
              {v.label}
            </label>
          ))}
        </div>
        {vehicleError && <span className="text-xs font-normal text-destructive">{vehicleError}</span>}
      </fieldset>
      <Field
        label="Placa"
        name="licensePlate"
        placeholder="ABC1D23"
        autoCapitalize="characters"
        state={state}
        hint="Obrigatória para moto e carro."
      />
      <Submit>Enviar cadastro</Submit>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login?callbackUrl=/courier" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
