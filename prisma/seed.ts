import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

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
      name: "Brayan Odira",
      password: adminHash,
      role: "ADMIN",
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { email: "supervisor@nampark.com" },
    update: {},
    create: {
      email: "supervisor@nampark.com",
      name: "Site Supervisor",
      password: hash,
      role: "SUPERVISOR",
    },
  });

  // Create routes
  const routesData = [
    { name: "Gatundu", mileageBefore: 900, mileageAfter: 1450, targetDaily: 1100000 },
    { name: "Mununga", mileageBefore: 1600, mileageAfter: 1750, targetDaily: 1100000 },
    { name: "Molo", mileageBefore: 400, mileageAfter: 650, targetDaily: 562500 },
    { name: "Kandara", mileageBefore: 800, mileageAfter: 1450, targetDaily: 1100000 },
    { name: "Mataara", mileageBefore: 1200, mileageAfter: 1950, targetDaily: 1100000 },
    { name: "Ngararia", mileageBefore: 1000, mileageAfter: 1450, targetDaily: 1100000 },
    { name: "Majengo", mileageBefore: 400, mileageAfter: 750, targetDaily: 562500 },
    { name: "Gakoe", mileageBefore: 1200, mileageAfter: 1650, targetDaily: 1100000 },
  ];

  const routes: Record<string, any> = {};
  for (const r of routesData) {
    routes[r.name] = await prisma.route.upsert({
      where: { name: r.name },
      update: r,
      create: r,
    });
  }

  // Create sales reps
  const repsData = [
    { name: "Nahashon Nene", email: "nene@nampark.com", routes: ["Gatundu"] },
    { name: "Joseph Macharia", email: "macharia@nampark.com", routes: ["Mununga"] },
    { name: "Kelvin Mwangi", email: "kelvin@nampark.com", routes: ["Molo", "Gakoe"] },
    { name: "Matthew Rop", email: "rop@nampark.com", routes: ["Kandara"] },
    { name: "Bernard Rono", email: "rono@nampark.com", routes: ["Mataara", "Majengo"] },
    { name: "Elijah Kamau", email: "kamau@nampark.com", routes: ["Ngararia"] },
  ];

  const reps: Record<string, any> = {};
  for (const r of repsData) {
    const user = await prisma.user.upsert({
      where: { email: r.email },
      update: {},
      create: {
        email: r.email,
        name: r.name,
        password: hash,
        role: "SALES_REP",
      },
    });
    const salesRep = await prisma.salesRep.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, name: r.name },
    });
    reps[r.name] = salesRep;

    for (const routeName of r.routes) {
      await prisma.salesRepRoute.create({
        data: { salesRepId: salesRep.id, routeId: routes[routeName].id },
      });
    }
  }

  // Create drivers
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
      create: { userId: user.id, name: d.name },
    });
  }

  // Create vehicles
  const vehiclesData = [
    { registration: "KDW 852B", status: "ACTIVE" as const },
    { registration: "KDN 396Q", status: "ACTIVE" as const },
    { registration: "KDX 478B", status: "ACTIVE" as const },
    { registration: "KDL 166M", status: "ACTIVE" as const },
  ];

  for (const v of vehiclesData) {
    await prisma.vehicle.upsert({
      where: { registration: v.registration },
      update: v,
      create: v,
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
    await prisma.skuCatalog.create({ data: s });
  }

  console.log("Seed complete!");
  console.log("Login credentials:");
  console.log("  Admin: admin@nampark.com / admin123");
  console.log("  Supervisor: supervisor@nampark.com / password123");
  console.log("  Sales Reps: <name>@nampark.com / password123");
  console.log("  Drivers: <name>@nampark.com / password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
