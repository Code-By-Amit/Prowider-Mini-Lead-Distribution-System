
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({connectionString:process.env.DATABASE_URL})

const prisma = new PrismaClient({adapter});

async function main() {

  // ─────────────────────────────────────────
  // STEP 1: 3 Services create karo real names se
  // ─────────────────────────────────────────
  const plumbing = await prisma.service.upsert({
    where: { name: "Plumbing" },
    update: {},
    create: { name: "Plumbing" },
  });

  const electrical = await prisma.service.upsert({
    where: { name: "Electrical" },
    update: {},
    create: { name: "Electrical" },
  });

  const carpentry = await prisma.service.upsert({
    where: { name: "Carpentry" },
    update: {},
    create: { name: "Carpentry" },
  });

  console.log("✅ Services bane:", plumbing.id, electrical.id, carpentry.id);

 // ─────────────────────────────────────────
// STEP 2: 8 Providers — real contractor companies
//
// Plumbing ke liye → p1, p2, p3, p4
// Electrical ke liye → p5, p6, p7, p8
// (Carpentry dono se share karta hai)
// ─────────────────────────────────────────

// --- Plumbing Contractors ---
const p1 = await prisma.provider.upsert({
  where: { name: "Ramesh Plumbing Works" },
  update: {},
  create: { name: "Ramesh Plumbing Works", monthlyQuota: 10, currentMonthLeads: 0 },
});

const p2 = await prisma.provider.upsert({
  where: { name: "Sharma Pipe Solutions" },
  update: {},
  create: { name: "Sharma Pipe Solutions", monthlyQuota: 10, currentMonthLeads: 0 },
});

const p3 = await prisma.provider.upsert({
  where: { name: "Jaipur Plumbers Co." },
  update: {},
  create: { name: "Jaipur Plumbers Co.", monthlyQuota: 10, currentMonthLeads: 0 },
});

const p4 = await prisma.provider.upsert({
  where: { name: "AquaFix & Woodcraft Services" },
  update: {},
  create: { name: "AquaFix & Woodcraft Services", monthlyQuota: 10, currentMonthLeads: 0 },
});

// --- Electrical Contractors ---
const p5 = await prisma.provider.upsert({
  where: { name: "Suresh Electricals" },
  update: {},
  create: { name: "Suresh Electricals", monthlyQuota: 10, currentMonthLeads: 0 },
});

const p6 = await prisma.provider.upsert({
  where: { name: "Verma Power & Interiors" },
  update: {},
  create: { name: "Verma Power & Interiors", monthlyQuota: 10, currentMonthLeads: 0 },
});

const p7 = await prisma.provider.upsert({
  where: { name: "BrightWire & Woodworks" },
  update: {},
  create: { name: "BrightWire Electricians", monthlyQuota: 10, currentMonthLeads: 0 },
});

const p8 = await prisma.provider.upsert({
  where: { name: "Singh Home Solutions " },
  update: {},
  create: { name: "Singh Home Solutions ", monthlyQuota: 10, currentMonthLeads: 0 },
});

  // ─────────────────────────────────────────
  // STEP 3: AllocationState — round robin queue
  //
  // Plumbing (Service 1):
  //   Mandatory = p1 (hamesha milega)
  //   Fair pool = p2, p3, p4 (baari baari)
  //
  // Electrical (Service 2):
  //   Mandatory = p5 (hamesha milega)
  //   Fair pool = p6, p7, p8 (baari baari)
  //
  // Carpentry (Service 3):
  //   Mandatory = p1, p4 (hamesha milenge)
  //   Fair pool = p2, p3, p5, p6, p7, p8 (baari baari)
  // ─────────────────────────────────────────

  await prisma.allocationState.upsert({
    where: { serviceId: plumbing.id },
    update: {},
    create: {
      serviceId: plumbing.id,
      poolOrder: [p2.id, p3.id, p4.id], // real DB ids use ho rahe hain
      currentIndex: 0,
    },
  });

  await prisma.allocationState.upsert({
    where: { serviceId: electrical.id },
    update: {},
    create: {
      serviceId: electrical.id,
      poolOrder: [p6.id, p7.id, p8.id],
      currentIndex: 0,
    },
  });

  await prisma.allocationState.upsert({
    where: { serviceId: carpentry.id },
    update: {},
    create: {
      serviceId: carpentry.id,
      poolOrder: [p2.id, p3.id, p5.id, p6.id, p7.id, p8.id],
      currentIndex: 0,
    },
  });

  console.log("✅ AllocationState bana");
  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });