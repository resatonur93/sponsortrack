import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const tenant = await prisma.tenant.upsert({
    where: { licenceNumber: "DEMO-LIC-001" },
    update: {},
    create: {
      companyName: "Demo Sponsor Ltd",
      licenceNumber: "DEMO-LIC-001",
      address: "London, UK",
    },
  });

  const passwordHash = await bcrypt.hash("Password123!", 12);

  await prisma.user.upsert({
    where: {
      email: "officer@demo.local",
    },
    update: { password: passwordHash },
    create: {
      email: "officer@demo.local",
      password: passwordHash,
      firstName: "Authorising",
      lastName: "Officer",
      role: Role.AUTHORISING_OFFICER,
      tenantId: tenant.id,
    },
  });

  await prisma.user.upsert({
    where: {
      email: "readonly@demo.local",
    },
    update: { password: passwordHash },
    create: {
      email: "readonly@demo.local",
      password: passwordHash,
      firstName: "Level",
      lastName: "Two",
      role: Role.LEVEL_2_USER,
      tenantId: tenant.id,
    },
  });

  await prisma.user.upsert({
    where: {
      email: "admin@sponsortrack.local",
    },
    update: { password: passwordHash },
    create: {
      email: "admin@sponsortrack.local",
      password: passwordHash,
      firstName: "Admin",
      lastName: "User",
      role: Role.LEVEL_1_USER,
      tenantId: tenant.id,
    },
  });

  console.log("");
  console.log("========== SponsorTrack seed OK ==========");
  console.log("Giriş: e-posta + şifre (Tenant ID gerekmez).");
  console.log("Şifre (hepsi için aynı): Password123!");
  console.log("");
  console.log("Kullanıcılar:");
  console.log("  - officer@demo.local      (AUTHORISING_OFFICER)");
  console.log("  - admin@sponsortrack.local (LEVEL_1_USER)");
  console.log("  - readonly@demo.local      (LEVEL_2_USER, sadece okuma)");
  console.log("===========================================");
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
