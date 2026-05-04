import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding...");

  // Admin user
  const adminEmail = process.env.ADMIN_EMAIL || "hswnbrys@gmail.com";
  const adminPass = process.env.ADMIN_PASSWORD || "hhhhmmmm";
  const passwordHash = await bcrypt.hash(adminPass, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: passwordHash, role: "admin" },
    create: {
      email: adminEmail,
      password: passwordHash,
      role: "admin",
      name: "Admin",
    },
  });
  console.log(`Admin ready: ${adminEmail}`);

  const women = await prisma.category.upsert({
    where: { slug: "women" },
    update: {},
    create: { slug: "women", name: "نساء", nameEn: "Women" },
  });

  const men = await prisma.category.upsert({
    where: { slug: "men" },
    update: {},
    create: { slug: "men", name: "رجال", nameEn: "Men" },
  });

  await prisma.product.upsert({
    where: { slug: "sample-dress" },
    update: {},
    create: {
      slug: "sample-dress",
      name: "فستان فاخر",
      nameEn: "Luxury Dress",
      price: 75000,
      image: "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=800",
      gender: "women",
      categoryId: women.id,
      featured: true,
    },
  });

  await prisma.product.upsert({
    where: { slug: "sample-suit" },
    update: {},
    create: {
      slug: "sample-suit",
      name: "بدلة كلاسيكية",
      nameEn: "Classic Suit",
      price: 120000,
      image: "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=800",
      gender: "men",
      categoryId: men.id,
      featured: true,
    },
  });

  console.log("Done.");
}

main().finally(() => prisma.$disconnect());
