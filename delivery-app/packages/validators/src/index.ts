// Schemas compartilhados entre formulários (client) e handlers/actions (server).
import { z } from "zod";

const id = z.string().min(1).max(64);
const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);
const cents = z.number().int().min(0);

// --- Auth --------------------------------------------------------------------

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().toLowerCase(),
  phone: z.string().regex(/^\+?\d{10,13}$/, "Telefone inválido").optional(),
  password: z.string().min(8, "Mínimo de 8 caracteres").max(128),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(1).max(128),
});

// --- Endereço ----------------------------------------------------------------

export const addressSchema = z.object({
  label: z.string().max(40).optional(),
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, "CEP inválido"),
  street: z.string().min(2).max(120),
  number: z.string().min(1).max(10),
  complement: z.string().max(60).optional(),
  neighborhood: z.string().min(2).max(80),
  city: z.string().min(2).max(80),
  state: z.string().length(2).toUpperCase(),
  reference: z.string().max(120).optional(),
  latitude,
  longitude,
  isDefault: z.boolean().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;

// --- Catálogo ----------------------------------------------------------------

export const storeListQuerySchema = z.object({
  lat: z.coerce.number().pipe(latitude),
  lng: z.coerce.number().pipe(longitude),
  category: z.string().max(60).optional(),
  q: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// --- Carrinho / pedido -------------------------------------------------------

export const cartLineSchema = z.object({
  productId: id,
  quantity: z.number().int().min(1).max(99),
  optionIds: z.array(id).max(30).default([]),
  notes: z.string().trim().max(140).optional(),
});

export const checkoutQuoteSchema = z.object({
  storeId: id,
  addressId: id,
  lines: z.array(cartLineSchema).min(1).max(50),
});
export type CheckoutQuoteInput = z.infer<typeof checkoutQuoteSchema>;

export const createOrderSchema = checkoutQuoteSchema.extend({
  paymentMethod: z.enum(["PIX", "CREDIT_CARD", "DEBIT_CARD", "CASH"]),
  changeForCents: cents.optional(),
  customerNotes: z.string().trim().max(280).optional(),
  // Token do cartão gerado no navegador (Mercado Pago Bricks / Stripe Elements).
  cardToken: z.string().max(512).optional(),
  cardPaymentMethodId: z.string().max(40).optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const rejectOrderSchema = z.object({ reason: z.string().trim().min(3).max(280) });

// --- Cardápio (portal do restaurante) ---------------------------------------

export const productOptionSchema = z.object({
  id: id.optional(),
  name: z.string().trim().min(1).max(80),
  priceCents: cents,
  isAvailable: z.boolean().default(true),
});

export const productOptionGroupSchema = z
  .object({
    id: id.optional(),
    name: z.string().trim().min(1).max(80),
    minSelect: z.number().int().min(0).max(20),
    maxSelect: z.number().int().min(1).max(20),
    options: z.array(productOptionSchema).min(1).max(50),
  })
  .refine((g) => g.minSelect <= g.maxSelect, { message: "Mínimo maior que o máximo", path: ["minSelect"] });

export const productSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  categoryId: id.nullable().optional(),
  imageUrl: z.url().optional(),
  priceCents: cents,
  compareAtCents: cents.optional(),
  isAvailable: z.boolean().default(true),
  optionGroups: z.array(productOptionGroupSchema).max(20).default([]),
});
export type ProductInput = z.infer<typeof productSchema>;

// --- Entregador --------------------------------------------------------------

export const courierLocationSchema = z.object({
  latitude,
  longitude,
  heading: z.number().min(0).max(360).optional(),
  speedKmh: z.number().min(0).max(250).optional(),
});

export const completeDeliverySchema = z.object({
  pin: z.string().regex(/^\d{4}$/, "PIN de 4 dígitos"),
  proofPhotoUrl: z.url().optional(),
});

// --- Admin -------------------------------------------------------------------

export const platformSettingsSchema = z.object({
  defaultCommissionBps: z.number().int().min(0).max(5000),
  serviceFeeCents: cents,
  courierBaseFeeCents: cents,
  courierFeePerKmCents: cents,
  orderAcceptTimeoutSec: z.number().int().min(60).max(3600),
});
