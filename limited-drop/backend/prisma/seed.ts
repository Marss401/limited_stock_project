import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
// Use the same path you used in your script.ts
import { PrismaClient } from '../generated/prisma/client';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  // console.log("Cleaning database...");
  // await prisma.inventoryLog.deleteMany();
  // await prisma.reservation.deleteMany(); 
  //  2. Delete Parent records last
  // await prisma.product.deleteMany();
  // await prisma.user.deleteMany();

  console.log("Seeding database...");

  await prisma.$transaction(async (tx) => {
    // ─────────────────────────────
    // 1. USER (idempotent)
    // ─────────────────────────────
    const user = await prisma.user.upsert({
      where: { email: "test@example.com" },
      update: {},
      create: {
        email: "test@example.com",
        name: "Test User2",
      },
    });

    // ─────────────────────────────
    // 2. PRODUCTS (idempotent)
    // Use UNIQUE field → name
    // ─────────────────────────────
    const productsData = [
      {
        name: "Holo Sneaker X1",
        description: "Limited edition holographic sneakers. Only 50 pairs.",
        price: 299.99,
        totalStock: 50,
        available: 50,
      },
      {
        name: "Quantum Watch V2",
        description: "Titanium smartwatch, 100 units only.",
        price: 599.99,
        totalStock: 100,
        available: 100,
      },
      {
        name: "Nebula Hoodie",
        description: "Color-shifting fabric, 25 pieces worldwide.",
        price: 149.99,
        totalStock: 25,
        available: 25,
      },
    ];

    // IMPORTANT: ensure name is unique in schema if using this
    for (const product of productsData) {
      await prisma.product.upsert({
        where: { name: product.name }, // FIXED
        update: {
          description: product.description,
          price: product.price,
          totalStock: product.totalStock,
          available: product.available,
        },
        create: product,
      });
    }

    console.log("Seed complete:", {
      user: user.email,
      products: productsData.length,
    });
  });
}

// CLEAN SHUTDOWN
main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end(); // important for adapter
  });