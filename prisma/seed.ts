import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient, Role, LeadStatus } from "@prisma/client";
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
      role: Role.LEVEL_1_USER,
      tenantId: tenant.id,
    },
  });

  const adminPanelHash = await bcrypt.hash("Password123!", 12);
  await prisma.user.upsert({
    where: { email: "resatonurkurt@gmail.com" },
    update: { role: Role.AUTHORISING_OFFICER },
    create: {
      email: "resatonurkurt@gmail.com",
      password: adminPanelHash,
      firstName: "Admin",
      lastName: "Panel",
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
    update: { password: passwordHash, role: Role.SYSTEM_ADMIN },
    create: {
      email: "admin@sponsortrack.local",
      password: passwordHash,
      firstName: "Admin",
      lastName: "User",
      role: Role.SYSTEM_ADMIN,
      tenantId: tenant.id,
    },
  });

  const sampleLeads: Array<{
    email: string;
    companyName: string;
    name?: string;
    status: LeadStatus;
    source: string;
    phone?: string;
  }> = [
    { email: "john@techcorp.com", companyName: "TechCorp", name: "John", status: LeadStatus.NEW, source: "homepage" },
    { email: "sarah@global.uk", companyName: "Global UK", name: "Sarah", status: LeadStatus.CONTACTED, source: "contact_form" },
    { email: "mike@restaurant.co.uk", companyName: "London Bistro", name: "Mike", status: LeadStatus.DEMO_SCHEDULED, source: "demo_request" },
    { email: "emma@finance.io", companyName: "Finance IO", status: LeadStatus.QUALIFIED, source: "homepage" },
    { email: "alex@healthcare.uk", companyName: "Care UK Ltd", status: LeadStatus.NEW, source: "demo_request" },
    { email: "lisa@retail.co.uk", companyName: "Retail Chain", status: LeadStatus.LOST, source: "contact_form" },
    { email: "tom@startup.io", companyName: "Startup IO", status: LeadStatus.CONTACTED, source: "homepage", phone: "+44 7700 900123" },
  ];

  for (const l of sampleLeads) {
    const existing = await prisma.lead.findFirst({
      where: { email: l.email, isDeleted: false },
    });
    if (!existing) {
      await prisma.lead.create({
        data: {
          email: l.email,
          companyName: l.companyName,
          name: l.name,
          phone: l.phone,
          source: l.source,
          status: l.status,
        },
      });
    }
  }

  console.log("");
  console.log("========== SponsorTrack seed OK ==========");
  console.log("Giriş: e-posta + şifre (Tenant ID gerekmez).");
  console.log("Şifre (hepsi için aynı): Password123!");
  console.log("");
  console.log("Kullanıcılar:");
  console.log("  - officer@demo.local         (LEVEL_1_USER)");
  console.log("  - resatonurkurt@gmail.com    (AUTHORISING_OFFICER — tek /admin panel)");
  console.log("  - admin@sponsortrack.local   (SYSTEM_ADMIN — platform)");
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
