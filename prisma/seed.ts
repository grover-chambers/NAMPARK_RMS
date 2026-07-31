import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import masterData from "./master-data.json";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type MasterRoute = {
  name: string;
  travel: number;
  tonnage: number;
  orderDays: string[];
  deliveryDays: string[];
  group: string;
  rep: string;
  contact: string;
  vehicle: string;
};

function emailFromName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "") + "@nampark.com"
  );
}

async function main() {
  console.log("Seeding database...");

  const hash = await bcrypt.hash("password123", 10);
  const adminHash = await bcrypt.hash("admin123", 10);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@nampark.com" },
    update: {},
    create: {
      email: "admin@nampark.com",
      name: "Madam Sophie",
      password: adminHash,
      role: "ADMIN",
    },
  });

  const pilotSupervisor = await prisma.user.upsert({
    where: { email: "supervisor@nampark.com" },
    update: {},
    create: {
      email: "supervisor@nampark.com",
      name: "Site Supervisor",
      password: hash,
      role: "SUPERVISOR",
    },
  });

  // Create group supervisors (one per group A-G)
  const groupSupervisorIds: Record<string, string> = {};
  for (const [group, first] of Object.entries(masterData.groupSupervisors)) {
    const name = first.charAt(0).toUpperCase() + first.slice(1);
    const user = await prisma.user.upsert({
      where: { email: `${first}@nampark.com` },
      update: {},
      create: {
        email: `${first}@nampark.com`,
        name,
        password: hash,
        role: "SUPERVISOR",
      },
    });
    groupSupervisorIds[group] = user.id;
  }

  // Create route groups
  const routeGroups: Record<string, any> = {};
  for (const group of ["A", "B", "C", "D", "E", "F", "G"]) {
    routeGroups[group] = await prisma.routeGroup.upsert({
      where: { name: group },
      update: { supervisorId: groupSupervisorIds[group] },
      create: { name: group, supervisorId: groupSupervisorIds[group] },
    });
  }

  // Upsert vehicles from master data
  const routes = masterData.routes as MasterRoute[];
  const vehicleRegs = [...new Set(routes.map((r) => r.vehicle).filter(Boolean))];
  const tonnageByVehicle: Record<string, number> = {};
  for (const r of routes) {
    if (!r.vehicle) continue;
    tonnageByVehicle[r.vehicle] = Math.max(tonnageByVehicle[r.vehicle] || 0, r.tonnage);
  }

  const vehicles: Record<string, any> = {};
  for (const reg of vehicleRegs) {
    vehicles[reg] = await prisma.vehicle.upsert({
      where: { registration: reg },
      update: {},
      create: {
        registration: reg,
        status: "ACTIVE",
        tonnageCapacity: tonnageByVehicle[reg],
      },
    });
  }

  // Upsert routes from master data
  const routeMap: Record<string, any> = {};
  for (const r of routes) {
    const targetDaily = r.tonnage >= 10 ? 1100000 : 562500;
    routeMap[r.name] = await prisma.route.upsert({
      where: { name: r.name },
      update: {
        tonnage: r.tonnage,
        orderTakingDays: r.orderDays,
        deliveryDays: r.deliveryDays,
        groupId: routeGroups[r.group]?.id,
        defaultVehicleId: r.vehicle ? vehicles[r.vehicle]?.id ?? null : null,
      },
      create: {
        name: r.name,
        mileageBefore: r.travel,
        mileageAfter: r.travel,
        targetDaily,
        tonnage: r.tonnage,
        orderTakingDays: r.orderDays,
        deliveryDays: r.deliveryDays,
        shiftType: "ONSITE",
        groupId: routeGroups[r.group]?.id,
        defaultVehicleId: r.vehicle ? vehicles[r.vehicle]?.id ?? null : null,
      },
    });
  }

  // Upsert sales reps from master data
  const reps: Record<string, any> = {};
  for (const r of routes) {
    if (reps[r.rep]) continue;
    const email = emailFromName(r.rep);
    const supervisorId = groupSupervisorIds[r.group];
    const user = await prisma.user.upsert({
      where: { email },
      update: { phone: r.contact || null },
      create: {
        email,
        name: r.rep,
        password: hash,
        role: "SALES_REP",
        phone: r.contact || null,
      },
    });
    reps[r.rep] = await prisma.salesRep.upsert({
      where: { userId: user.id },
      update: { supervisorId },
      create: { userId: user.id, name: r.rep, supervisorId },
    });
  }

  // Link each route to its rep
  for (const r of routes) {
    const rep = reps[r.rep];
    await prisma.salesRepRoute.upsert({
      where: { salesRepId_routeId: { salesRepId: rep.id, routeId: routeMap[r.name].id } },
      update: {},
      create: { salesRepId: rep.id, routeId: routeMap[r.name].id },
    });
  }

  // Create drivers (pilot set — full driver list to be provided)
  const driversData = [
    { name: "Samuel Lukayo", email: "lukayo@nampark.com", vehicle: "KDW 852B" },
    { name: "Joseph Kamau", email: "jkamau@nampark.com", vehicle: "KDN 396Q" },
    { name: "Samuel Muchai", email: "muchai@nampark.com", vehicle: "KDX 478B" },
    { name: "Brian Mwangi", email: "bmwangi@nampark.com", vehicle: "KDL 166M" },
  ];

  for (const d of driversData) {
    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        email: d.email,
        name: d.name,
        password: hash,
        role: "DRIVER",
      },
    });
    await prisma.driver.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, name: d.name, supervisorId: pilotSupervisor.id },
    });
  }

  // Create SKU catalog from actual data
  const skusData = [
    { name: "Ndovu Home Baking 2kg", category: "Flour", unitPrice: 1840, unitType: "piece", packSize: "2kg" },
    { name: "Ndovu Home Baking 1kg", category: "Flour", unitPrice: 1870, unitType: "piece", packSize: "1kg" },
    { name: "Soko Home Baking 2kg", category: "Flour", unitPrice: 1890, unitType: "piece", packSize: "2kg" },
    { name: "Soko Home Baking 1kg", category: "Flour", unitPrice: 1920, unitType: "piece", packSize: "1kg" },
    { name: "Raha Home Baking 2kg", category: "Flour", unitPrice: 1870, unitType: "piece", packSize: "2kg" },
    { name: "Ajab Home Baking 2kg", category: "Flour", unitPrice: 1850, unitType: "piece", packSize: "2kg" },
    { name: "210 Home Baking 2kg", category: "Flour", unitPrice: 1870, unitType: "piece", packSize: "2kg" },
    { name: "210 Home Baking 1kg", category: "Flour", unitPrice: 1900, unitType: "piece", packSize: "1kg" },
    { name: "Lea Maize Meal 2kg", category: "Flour", unitPrice: 2100, unitType: "piece", packSize: "2kg" },
    { name: "Softcare Home Care Large", category: "Soap", unitPrice: 4020, unitType: "carton", packSize: "large" },
    { name: "Softcare Home Care Medium", category: "Soap", unitPrice: 3950, unitType: "carton", packSize: "medium" },
    { name: "Menengai Cream 1kg", category: "Soap", unitPrice: 2600, unitType: "carton", packSize: "1kg" },
    { name: "Jamaa Cream 1kg", category: "Soap", unitPrice: 2500, unitType: "carton", packSize: "1kg" },
    { name: "Big Boss Soap", category: "Soap", unitPrice: 1400, unitType: "piece" },
    { name: "Patco Wrapped", category: "Confectionery", unitPrice: 150, unitType: "packet" },
    { name: "King Kuba", category: "Confectionery", unitPrice: 320, unitType: "packet" },
    { name: "Big Daddy", category: "Confectionery", unitPrice: 265, unitType: "packet" },
    { name: "Sindano White 25kg", category: "Rice", unitPrice: 3700, unitType: "bag", packSize: "25kg" },
    { name: "Marai Rice", category: "Rice", unitPrice: 2200, unitType: "piece" },
    { name: "Sugar 50kg", category: "Sugar", unitPrice: 6600, unitType: "bag", packSize: "50kg" },
    { name: "Rina 2L", category: "Cooking Oil", unitPrice: 4850, unitType: "carton", packSize: "2L" },
    { name: "Salit 20L", category: "Cooking Oil", unitPrice: 4850, unitType: "jar", packSize: "20L" },
    { name: "Zesta 1kg", category: "Sugar", unitPrice: 1600, unitType: "piece", packSize: "1kg" },
    { name: "Steam Energy 400ml", category: "Beverages", unitPrice: 400, unitType: "carton", packSize: "400ml" },
    { name: "Gomba Chewing Gum", category: "Confectionery", unitPrice: 145, unitType: "packet" },
    { name: "Maya Home Care Large", category: "Soap", unitPrice: 2600, unitType: "bale" },
    { name: "Maya Home Care Medium", category: "Soap", unitPrice: 2500, unitType: "bale" },
    { name: "Elianto 1L", category: "Cooking Oil", unitPrice: 1200, unitType: "carton" },
    { name: "Rina 1L", category: "Cooking Oil", unitPrice: 4820, unitType: "carton", packSize: "1L" },
    { name: "Waste Paper", category: "Paper", unitPrice: 100, unitType: "bale" },
    { name: "Pika 500ml", category: "Beverages", unitPrice: 925, unitType: "carton", packSize: "500ml" },
    { name: "Pika 10L", category: "Cooking Oil", unitPrice: 2460, unitType: "jar", packSize: "10L" },
    { name: "Chapa Mandazi", category: "Flour", unitPrice: 2230, unitType: "carton" },
    { name: "Sunny Girl", category: "Confectionery", unitPrice: 200, unitType: "packet" },
    { name: "Doffi Powder 10kg", category: "Detergent", unitPrice: 1130, unitType: "piece", packSize: "10kg" },
    { name: "Nescafe 1.5gms", category: "Beverages", unitPrice: 4330, unitType: "carton" },
    { name: "Maccoffee", category: "Beverages", unitPrice: 4020, unitType: "carton" },
  ];

  for (const s of skusData) {
    const existingSku = await prisma.skuCatalog.findFirst({ where: { name: s.name } });
    if (existingSku) {
      await prisma.skuCatalog.update({
        where: { id: existingSku.id },
        data: { unitPrice: s.unitPrice },
      });
    } else {
      await prisma.skuCatalog.create({ data: s });
    }
  }

  // Create challenges (only once)
  const challengeCount = await prisma.challenge.count();
  if (challengeCount === 0) {
    const challengesData = [
      { gap: "Delivery truck breakdown on Kandara route", whatAction: "Arrange backup vehicle from partner fleet", who: "Fleet Manager", when: "2026-06-15", resolved: true },
      { gap: "Stock shortage of Ndovu 2kg in Molo route", whatAction: "Increase weekly allocation by 20%", who: "Warehouse", when: "2026-06-18", resolved: true },
      { gap: "Customer complaints on expired Sugar 50kg", whatAction: "Implement FIFO check before dispatch", who: "Quality Assurance", when: "2026-06-20", resolved: false },
      { gap: "Pricing inconsistency in Gatundu market", whatAction: "Conduct pricing survey update", who: "Nahashon Nene", when: "2026-06-22", resolved: false },
      { gap: "Low sales in Mununga route", whatAction: "Increase route frequency and promo activity", who: "Joseph Macharia", when: "2026-07-01", resolved: false },
    ];

    for (const c of challengesData) {
      await prisma.challenge.create({
        data: {
          date: new Date(),
          gap: c.gap,
          whatAction: c.whatAction,
          who: c.who,
          when: new Date(c.when),
          resolved: c.resolved,
        },
      });
    }
  }

  // Create cashier user
  const cashierUser = await prisma.user.upsert({
    where: { email: "cashier@nampark.com" },
    update: {},
    create: {
      email: "cashier@nampark.com",
      name: "Nancy Wanjiku",
      password: hash,
      role: "CASHIER",
    },
  });

  // Create cashier accounts for each sales rep
  const allReps = await prisma.salesRep.findMany();
  for (const rep of allReps) {
    await prisma.cashierAccount.upsert({
      where: { repId: rep.id },
      update: {},
      create: {
        repId: rep.id,
        status: "open",
        currentBalance: 0,
        creditReferenceAmount: 1100000, // default — admin/cashier adjusts per rep performance
        autoBlockThresholdPct: 25,
      },
    });
  }

  console.log("Seed complete!");
  console.log("Login credentials:");
  console.log("  Admin: admin@nampark.com / admin123");
  console.log("  Supervisor: supervisor@nampark.com / password123");
  console.log("  Cashier: cashier@nampark.com / password123");
  console.log("  Group Supervisors: julius@nampark.com, kelvin@nampark.com, nene@nampark.com, sam@nampark.com, njenga@nampark.com, martin@nampark.com, macharia@nampark.com / password123");
  console.log("  Sales Reps: <sanitized-full-name>@nampark.com / password123");
  console.log("  Drivers: <name>@nampark.com / password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
