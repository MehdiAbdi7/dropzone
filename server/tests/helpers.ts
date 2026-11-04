import bcrypt from "bcryptjs";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";

export const PASSWORD = "motdepasse123";

// Vide toutes les tables avant chaque test. RESTART IDENTITY remet aussi les
// séquences à leur départ : la première commande de chaque test porte le numéro 1001.
export async function resetDb() {
  await prisma.$executeRaw`TRUNCATE order_items, orders, users, variant_gifts, product_images,
    product_variants, "_ProductCompatibleModels", products, series, brands, choices, device_models, categories
    RESTART IDENTITY CASCADE`;
}

// Un petit catalogue : un iPhone vendu neuf et en reconditionné (dont une affaire
// et un appareil avec une limitation), un chargeur offert, une coque compatible, un brouillon.
export async function createCatalog() {
  const phones = await prisma.category.create({
    data: { name: "Smartphones", slug: "smartphones", kind: "phone" },
  });
  const accessories = await prisma.category.create({
    data: { name: "Accessoires", slug: "accessoires", kind: "accessory" },
  });
  const iphone = await prisma.deviceModel.create({
    data: { brand: "Apple", name: "iPhone 15 Pro Max", slug: "apple-iphone-15-pro-max", kind: "phone", releaseYear: 2023 },
  });
  const galaxy = await prisma.deviceModel.create({
    data: { brand: "Samsung", name: "Galaxy S24 Ultra", slug: "samsung-galaxy-s24-ultra", kind: "phone", releaseYear: 2024 },
  });
  // Les marques : iPhone (logo Apple) et Samsung dans Smartphones, Anker (sans logo de
  // bibliothèque) dans Accessoires. Seul le brouillon est Samsung.
  const iphoneBrand = await prisma.brand.create({
    data: { categoryId: phones.id, name: "iPhone", slug: "iphone", makerName: "Apple", logoUrl: "/brands/apple.svg" },
  });
  const samsungBrand = await prisma.brand.create({
    data: {
      categoryId: phones.id,
      name: "Samsung",
      slug: "samsung",
      makerName: "Samsung",
      logoUrl: "/brands/samsung.svg",
      position: 1,
    },
  });
  const ankerBrand = await prisma.brand.create({
    data: { categoryId: accessories.id, name: "Anker", slug: "anker" },
  });

  const charger = await prisma.product.create({
    data: {
      name: "Chargeur USB-C 20 W",
      slug: "chargeur-usb-c-20-w",
      description: "Charge rapide",
      categoryId: accessories.id,
      brandId: ankerBrand.id,
      status: "published",
      minPrice: 2500,
      variants: { create: [{ sku: "CHG-20W", price: 2500, stock: 5 }] },
    },
  });
  const phoneCase = await prisma.product.create({
    data: {
      name: "Coque antichoc iPhone 15 Pro Max",
      slug: "coque-antichoc-iphone-15-pro-max",
      description: "Coins renforcés",
      categoryId: accessories.id,
      status: "published",
      minPrice: 1800,
      compatibleModels: { connect: [{ id: iphone.id }] },
      variants: { create: [{ sku: "COQ-IP15PM", price: 1800, stock: 10 }] },
    },
  });
  const phone = await prisma.product.create({
    data: {
      name: "iPhone 15 Pro Max",
      slug: "iphone-15-pro-max",
      description: "Titane",
      categoryId: phones.id,
      deviceModelId: iphone.id,
      brandId: iphoneBrand.id,
      status: "published",
      minPrice: 150000,
      variants: {
        create: [
          { sku: "IP-NEW-256", price: 245000, stock: 3, options: { Stockage: "256 Go" } },
          {
            sku: "IP-R-DEAL",
            price: 185000,
            stock: 1,
            condition: "refurbished",
            grade: 8,
            batteryHealth: 95,
            defects: ["Cache arrière fissuré"],
            // Une affaire avec un chargeur offert (le cadeau est ajouté plus bas).
            withBox: false,
          },
          {
            sku: "IP-R-WIFI",
            price: 150000,
            stock: 1,
            condition: "refurbished",
            grade: 9,
            batteryHealth: 91,
            limitations: ["Wi-Fi seulement (ne lit pas les cartes SIM)"],
            withBox: false,
          },
          {
            sku: "IP-R-SOLD",
            price: 120000,
            stock: 0,
            condition: "refurbished",
            grade: 9,
            batteryHealth: 90,
            withBox: false,
          },
        ],
      },
    },
  });
  const deal = await prisma.productVariant.findUniqueOrThrow({ where: { sku: "IP-R-DEAL" } });
  const chargerVariant = await prisma.productVariant.findUniqueOrThrow({ where: { sku: "CHG-20W" } });
  await prisma.variantGift.create({ data: { variantId: deal.id, giftVariantId: chargerVariant.id } });

  await prisma.product.create({
    data: {
      name: "Galaxy Z Flip6",
      slug: "galaxy-z-flip6",
      description: "Bientôt",
      categoryId: phones.id,
      deviceModelId: galaxy.id,
      brandId: samsungBrand.id,
      status: "draft",
      variants: { create: [{ sku: "ZFLIP6", price: 175000, stock: 2 }] },
    },
  });

  return {
    phones,
    accessories,
    iphone,
    galaxy,
    charger,
    phoneCase,
    phone,
    chargerVariant,
    iphoneBrand,
    samsungBrand,
    ankerBrand,
  };
}

export async function createUser(role: "customer" | "admin" = "customer", email = `${role}@test.dz`) {
  return prisma.user.create({
    data: {
      firstName: "Amine",
      lastName: "Test",
      email,
      phone: "0555123456",
      role,
      passwordHash: await bcrypt.hash(PASSWORD, 4),
    },
  });
}

// Un « navigateur » Supertest qui garde le cookie de connexion entre les requêtes.
export async function loginAs(role: "customer" | "admin" = "customer", email?: string) {
  const user = await createUser(role, email);
  const agent = request.agent(app);
  await agent.post("/auth/login").send({ email: user.email, password: PASSWORD }).expect(200);
  return { agent, user };
}

export const customer = {
  fullName: "Amine Test",
  phone: "0555 12 34 56",
  wilaya: "Alger",
  commune: "Kouba",
  address: "12 rue des Frères Bouadou",
  acceptTerms: true,
};

// L'aperçu puis la commande, comme le fait le front.
export async function previewThenOrder(
  items: { sku: string; quantity: number }[],
  extra: Record<string, unknown> = {},
  client: ReturnType<typeof request> | ReturnType<typeof request.agent> = request(app),
) {
  const preview = await request(app).post("/orders/preview").send({ items });
  return client
    .post("/orders")
    .send({ items, ...customer, cartHash: preview.body.data.cartHash, ...extra });
}
