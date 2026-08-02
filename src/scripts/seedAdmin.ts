import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const email = "admin@hospital360.local";
  const password = "admin_hospital_secure_2026_!";
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  console.log(`[Seed] Checking if user ${email} already exists...`);
  
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`[Seed] User ${email} already exists. Skipping.`);
    return;
  }

  console.log(`[Seed] Creating admin user: ${email}`);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      accessRole: "ADMIN",
    },
  });

  console.log("=========================================");
  console.log("🏥 ADMIN ACCOUNT SEEDED SUCCESSFULLY!");
  console.log(`📧 Email:    ${email}`);
  console.log(`🔑 Password: ${password}`);
  console.log("=========================================");
}

main()
  .catch((e) => {
    console.error("Error seeding admin account:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
