// Dados de desenvolvimento. Rode com: pnpm db:seed
// Todos os usuários usam a senha de SEED_PASSWORD (padrão: "delivery123").
import { hashPassword } from "@delivery/core";
import { createPrismaClient } from "../src/index.js";

const prisma = createPrismaClient();

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

  const category = (name: string, slug: string) =>
    prisma.storeCategory.upsert({ where: { slug }, update: {}, create: { name, slug } });
  const pizza = await category("Pizza", "pizza");

  const user = (email: string, name: string, roles: ("CUSTOMER" | "MERCHANT" | "COURIER" | "ADMIN")[]) =>
    prisma.user.upsert({
      where: { email },
      // Mantém senha e papéis dos usuários de teste em sincronia com este arquivo.
      update: { passwordHash, roles },
      create: { email, name, roles, passwordHash, emailVerified: new Date() },
    });

  const admin = await user("admin@delivery.test", "Admin", ["ADMIN", "MERCHANT"]);
  const merchant = await user("loja@delivery.test", "Dono da Pizzaria", ["CUSTOMER", "MERCHANT"]);
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

  const storeAddress = {
    zipCode: "01414-001",
    street: "Rua Haddock Lobo",
    neighborhood: "Cerqueira César",
    city: "São Paulo",
    state: "SP",
  };

  const pizzaria = await prisma.store.upsert({
    where: { slug: "pizzaria-do-bairro" },
    update: {},
    create: {
      ...storeAddress,
      slug: "pizzaria-do-bairro",
      name: "Pizzaria do Bairro",
      description: "Pizzas de longa fermentação no forno a lenha.",
      number: "500",
      latitude: -23.5605,
      longitude: -46.6634,
      status: "ACTIVE",
      isOpen: true,
      minOrderCents: 3000,
      prepTimeMinutes: 35,
      categories: { connect: [{ id: pizza.id }] },
      members: { create: { userId: merchant.id, role: "OWNER" } },
      openingHours: {
        create: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, opensAt: "18:00", closesAt: "23:30" })),
      },
    },
  });

  if ((await prisma.product.count({ where: { storeId: pizzaria.id } })) === 0) {
    const pizzas = await prisma.productCategory.create({
      data: { storeId: pizzaria.id, name: "Pizzas", position: 0 },
    });
    const bebidas = await prisma.productCategory.create({
      data: { storeId: pizzaria.id, name: "Bebidas", position: 1 },
    });

    const sizes = {
      name: "Tamanho",
      minSelect: 1,
      maxSelect: 1,
      options: {
        create: [
          { name: "Média (6 fatias)", priceCents: 0, position: 0 },
          { name: "Grande (8 fatias)", priceCents: 1000, position: 1 },
        ],
      },
    };

    await prisma.product.create({
      data: {
        storeId: pizzaria.id,
        categoryId: pizzas.id,
        name: "Margherita",
        description: "Molho de tomate, muçarela de búfala e manjericão.",
        priceCents: 4990,
        optionGroups: {
          create: [
            sizes,
            {
              name: "Borda recheada",
              minSelect: 0,
              maxSelect: 1,
              position: 1,
              options: { create: [{ name: "Catupiry", priceCents: 800 }, { name: "Cheddar", priceCents: 800 }] },
            },
          ],
        },
      },
    });
    await prisma.product.create({
      data: {
        storeId: pizzaria.id,
        categoryId: pizzas.id,
        name: "Calabresa",
        description: "Calabresa artesanal, cebola roxa e azeitonas.",
        priceCents: 4590,
        position: 1,
        optionGroups: { create: [sizes] },
      },
    });
    await prisma.product.create({
      data: { storeId: pizzaria.id, categoryId: bebidas.id, name: "Refrigerante lata", priceCents: 700 },
    });
  }

  // O app é de loja única (STORE_SLUG=pizzaria-do-bairro). O admin também entra no painel dela.
  await prisma.storeMember.upsert({
    where: { storeId_userId: { storeId: pizzaria.id, userId: admin.id } },
    update: {},
    create: { storeId: pizzaria.id, userId: admin.id, role: "MANAGER" },
  });

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
