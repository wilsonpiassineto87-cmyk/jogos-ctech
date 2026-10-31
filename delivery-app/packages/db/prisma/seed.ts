// Dados de desenvolvimento. Rode com: pnpm db:seed
// Todos os usuários usam a senha de SEED_PASSWORD (padrão: "delivery123").
import { hashPassword } from "@delivery/core";
import { createPrismaClient } from "../src/index.js";

const prisma = createPrismaClient();

// Loja atendida pelo app (STORE_SLUG em wrangler.jsonc / .env).
const STORE_SLUG = "sorveteria-do-bairro";

const FLAVORS = ["Chocolate belga", "Morango", "Creme", "Pistache", "Doce de leite", "Limão siciliano", "Flocos"];

type Option = [name: string, priceCents?: number];
const group = (name: string, minSelect: number, maxSelect: number, options: Option[], position = 0) => ({
  name,
  minSelect,
  maxSelect,
  position,
  options: { create: options.map(([optionName, priceCents = 0], i) => ({ name: optionName, priceCents, position: i })) },
});
const flavors = (maxSelect: number, position = 1) =>
  group(maxSelect === 1 ? "Sabor" : `Sabores (até ${maxSelect})`, 1, maxSelect, FLAVORS.map((f) => [f]), position);

async function main() {
  const passwordHash = await hashPassword(process.env.SEED_PASSWORD ?? "delivery123");

  await prisma.platformSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  await prisma.deliveryFeeRule.deleteMany();
  await prisma.deliveryFeeRule.createMany({
    data: [
      { name: "Até 3 km", maxDistanceKm: 3, baseFeeCents: 499 },
      { name: "3 a 8 km", minDistanceKm: 3, maxDistanceKm: 8, baseFeeCents: 499, feePerKmCents: 150 },
    ],
  });

  const sorvetes = await prisma.storeCategory.upsert({
    where: { slug: "sorvetes" },
    update: {},
    create: { name: "Sorvetes", slug: "sorvetes" },
  });

  const user = (email: string, name: string, roles: ("CUSTOMER" | "MERCHANT" | "COURIER" | "ADMIN")[]) =>
    prisma.user.upsert({
      where: { email },
      // Mantém senha e papéis dos usuários de teste em sincronia com este arquivo.
      update: { passwordHash, roles },
      create: { email, name, roles, passwordHash, emailVerified: new Date() },
    });

  const admin = await user("admin@delivery.test", "Admin", ["ADMIN", "MERCHANT"]);
  const merchant = await user("loja@delivery.test", "Dono da Sorveteria", ["CUSTOMER", "MERCHANT"]);
  const courier = await user("entregador@delivery.test", "Entregador Teste", ["COURIER"]);
  const customer = await user("cliente@delivery.test", "Cliente Teste", ["CUSTOMER"]);

  await prisma.courierProfile.upsert({
    where: { userId: courier.id },
    update: {},
    create: { userId: courier.id, taxId: "00000000191", vehicleType: "MOTORCYCLE", status: "APPROVED" },
  });

  if ((await prisma.address.count({ where: { userId: customer.id } })) === 0) {
    await prisma.address.create({
      data: {
        userId: customer.id,
        label: "Casa",
        zipCode: "01310-100",
        street: "Avenida Paulista",
        number: "1000",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
        latitude: -23.5649,
        longitude: -46.6525,
        isDefault: true,
      },
    });
  }

  // Sem horários cadastrados: a loja vende sempre que não estiver pausada no painel.
  const store = await prisma.store.upsert({
    where: { slug: STORE_SLUG },
    update: {},
    create: {
      slug: STORE_SLUG,
      name: "Sorveteria do Bairro",
      description: "Sorvetes artesanais, picolés e açaí feitos todos os dias.",
      zipCode: "01414-001",
      street: "Rua Haddock Lobo",
      number: "500",
      neighborhood: "Cerqueira César",
      city: "São Paulo",
      state: "SP",
      latitude: -23.5605,
      longitude: -46.6634,
      status: "ACTIVE",
      isOpen: true,
      minOrderCents: 1500,
      prepTimeMinutes: 15,
      categories: { connect: [{ id: sorvetes.id }] },
      members: { create: { userId: merchant.id, role: "OWNER" } },
    },
  });

  if ((await prisma.product.count({ where: { storeId: store.id } })) === 0) {
    const category = (name: string, position: number) =>
      prisma.productCategory.create({ data: { storeId: store.id, name, position } });
    const [copos, acai, milkshakes, picoles] = [
      await category("Sorvetes", 0),
      await category("Açaí", 1),
      await category("Milkshakes", 2),
      await category("Picolés", 3),
    ];
    const toppings = group(
      "Coberturas (até 2)",
      0,
      2,
      [
        ["Calda de chocolate", 200],
        ["Calda de morango", 200],
        ["Granulado", 150],
        ["Paçoca", 200],
        ["Chantilly", 250],
      ],
      2,
    );

    const products = [
      {
        categoryId: copos.id,
        name: "Sorvete no copo",
        description: "Sorvete artesanal no copo. Escolha o tamanho, até 3 sabores e coberturas.",
        priceCents: 1200,
        optionGroups: {
          create: [
            group("Tamanho", 1, 1, [["Pequeno (1 bola)"], ["Médio (2 bolas)", 600], ["Grande (3 bolas)", 1100]]),
            flavors(3),
            toppings,
          ],
        },
      },
      {
        categoryId: copos.id,
        name: "Casquinha",
        description: "Uma bola na casquinha crocante.",
        priceCents: 900,
        optionGroups: { create: [flavors(1, 0), group("Casquinha", 1, 1, [["Tradicional"], ["Banhada no chocolate", 300]], 1)] },
      },
      {
        categoryId: acai.id,
        name: "Açaí na tigela",
        description: "Açaí cremoso batido na hora.",
        priceCents: 1800,
        optionGroups: {
          create: [
            group("Tamanho", 1, 1, [["300 ml"], ["500 ml", 800], ["700 ml", 1400]]),
            group(
              "Acompanhamentos (até 4)",
              0,
              4,
              [["Banana"], ["Morango"], ["Granola"], ["Leite condensado", 200], ["Leite em pó", 200], ["Paçoca", 200]],
              1,
            ),
          ],
        },
      },
      {
        categoryId: milkshakes.id,
        name: "Milkshake",
        description: "400 ml, cremoso e gelado.",
        priceCents: 1700,
        optionGroups: {
          create: [group("Sabor", 1, 1, [["Chocolate"], ["Morango"], ["Baunilha"], ["Ovomaltine", 300], ["Nutella", 400]])],
        },
      },
      {
        categoryId: picoles.id,
        name: "Picolé de fruta",
        description: "Feito com fruta de verdade.",
        priceCents: 600,
        optionGroups: { create: [group("Sabor", 1, 1, [["Limão"], ["Uva"], ["Maracujá"], ["Coco"], ["Manga"]])] },
      },
      {
        categoryId: picoles.id,
        name: "Picolé cremoso",
        description: "Cremoso, com cobertura.",
        priceCents: 900,
        optionGroups: { create: [group("Sabor", 1, 1, [["Chocolate"], ["Morango"], ["Leite condensado"], ["Doce de leite"]])] },
      },
    ];
    for (const [position, product] of products.entries()) {
      await prisma.product.create({ data: { ...product, storeId: store.id, position } });
    }
  }

  // O admin também entra no painel da loja.
  await prisma.storeMember.upsert({
    where: { storeId_userId: { storeId: store.id, userId: admin.id } },
    update: {},
    create: { storeId: store.id, userId: admin.id, role: "MANAGER" },
  });

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
