import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../lib/password";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await hashPassword("admin1234");

  const admin = await prisma.user.upsert({
    where: { email: "admin@euforiamoda.test" },
    update: {},
    create: {
      name: "Admin Euforia Moda",
      email: "admin@euforiamoda.test",
      passwordHash,
      role: "ADMIN",
      city: "LA_PAZ",
    },
  });

  console.log("Seeded admin user:", admin.email, "(password: admin1234)");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
