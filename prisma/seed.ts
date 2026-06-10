import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function generateReferralCode(name: string): string {
  const base = name.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "RIDE";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${suffix}`;
}

async function backfillReferralCodes() {
  const users = await prisma.user.findMany({
    where: { referralCode: null },
    select: { id: true, name: true },
  });

  for (const user of users) {
    let code = generateReferralCode(user.name);
    while (await prisma.user.findUnique({ where: { referralCode: code } })) {
      code = generateReferralCode(user.name);
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { referralCode: code },
    });
  }

  if (users.length > 0) {
    console.log(`Backfilled referral codes for ${users.length} user(s)`);
  }
}

const CITIES = [
  { name: "Johannesburg", province: "Gauteng", slug: "johannesburg" },
  { name: "Cape Town", province: "Western Cape", slug: "cape-town" },
  { name: "Durban", province: "KwaZulu-Natal", slug: "durban" },
  { name: "Pretoria", province: "Gauteng", slug: "pretoria" },
  { name: "Polokwane", province: "Limpopo", slug: "polokwane" },
  { name: "Musina", province: "Limpopo", slug: "musina" },
  { name: "Mbombela", province: "Mpumalanga", slug: "mbombela" },
  { name: "George", province: "Western Cape", slug: "george" },
  { name: "Gqeberha", province: "Eastern Cape", slug: "gqeberha" },
  { name: "Bloemfontein", province: "Free State", slug: "bloemfontein" },
  { name: "Kimberley", province: "Northern Cape", slug: "kimberley" },
  { name: "Rustenburg", province: "North West", slug: "rustenburg" },
];

async function main() {
  console.log("Seeding VayaSA database...");

  for (const city of CITIES) {
    await prisma.city.upsert({
      where: { slug: city.slug },
      update: {},
      create: city,
    });
  }

  await prisma.platformSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { commissionRate: 0.1 },
  });

  const promos = [
    { code: "WELCOME10", discountType: "percent", discountValue: 10, maxUses: 1000 },
    { code: "FIRST50", discountType: "fixed", discountValue: 50, maxUses: 500 },
  ];
  for (const promo of promos) {
    await prisma.promoCode.upsert({
      where: { code: promo.code },
      update: {},
      create: promo,
    });
  }

  await backfillReferralCodes();

  const password = await bcrypt.hash("password123", 10);

  const legacyAdmin = await prisma.user.findUnique({
    where: { email: "admin@ridesa.co.za" },
  });
  if (legacyAdmin) {
    await prisma.user.update({
      where: { id: legacyAdmin.id },
      data: { email: "admin@vayasa.co.za", name: "VayaSA Admin", role: "admin" },
    });
  }

  await prisma.user.upsert({
    where: { email: "admin@vayasa.co.za" },
    update: { isAdmin: true, role: "admin" },
    create: {
      email: "admin@vayasa.co.za",
      name: "VayaSA Admin",
      phone: "+27 11 000 0000",
      password,
      role: "admin",
      isAdmin: true,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const drivers = [
    { email: "thabo@example.com", name: "Thabo Mokoena", gender: "male", phone: "+27 82 123 4567", bio: "Verified driver. JHB–CPT regular. Non-smoker.", vehicleModel: "VW Polo", vehicleColor: "White" },
    { email: "sarah@example.com", name: "Sarah van der Merwe", gender: "female", phone: "+27 83 234 5678", bio: "10+ years experience. Pet-friendly.", vehicleModel: "Toyota Fortuner", vehicleColor: "Grey" },
    { email: "zanele@example.com", name: "Zanele Dlamini", gender: "female", phone: "+27 84 345 6789", bio: "Durban–JHB weekly. Women-only rides available.", vehicleModel: "Hyundai Tucson", vehicleColor: "Blue" },
    { email: "johan@example.com", name: "Johan Botha", gender: "male", phone: "+27 85 456 7890", bio: "Pretoria–Polokwane specialist.", vehicleModel: "Ford Ranger", vehicleColor: "White" },
    { email: "nomsa@example.com", name: "Nomsa Khumalo", gender: "female", phone: "+27 86 567 8901", bio: "Limpopo routes. Spacious vehicle.", vehicleModel: "Isuzu D-Max", vehicleColor: "Black" },
  ];

  const createdDrivers = [];
  for (const driver of drivers) {
    const user = await prisma.user.upsert({
      where: { email: driver.email },
      update: {
        isDriver: true,
        driverVerificationStatus: "approved",
        gender: driver.gender,
        role: "passenger",
      },
      create: {
        email: driver.email,
        name: driver.name,
        gender: driver.gender,
        phone: driver.phone,
        password,
        bio: driver.bio,
        role: "passenger",
        isDriver: true,
        driverVerificationStatus: "approved",
        defaultStartAction: "driver",
        rating: 4.5 + Math.random() * 0.5,
        tripCount: Math.floor(Math.random() * 50) + 5,
        emailVerified: true,
        phoneVerified: true,
        identityVerified: true,
      },
    });

    await prisma.driverVerification.upsert({
      where: { userId: user.id },
      update: { status: "approved", reviewedAt: new Date() },
      create: {
        userId: user.id,
        status: "approved",
        idDocument: "id_document_placeholder.pdf",
        driverLicense: "drivers_license_placeholder.pdf",
        vehicleRegistration: "license_disk_placeholder.pdf",
        vehiclePhotos: JSON.stringify(["vehicle_front.jpg", "vehicle_rear.jpg"]),
        selfiePhoto: "selfie_placeholder.jpg",
        vehicleModel: driver.vehicleModel,
        vehicleColor: driver.vehicleColor,
        vehicleYear: 2020,
        reviewedAt: new Date(),
      },
    });

    createdDrivers.push(user);
  }

  const busOperator = await prisma.user.upsert({
    where: { email: "bus@vayasa.co.za" },
    update: {
      role: "bus_operator",
      busOperatorVerificationStatus: "approved",
      defaultStartAction: "bus_operator",
    },
    create: {
      email: "bus@vayasa.co.za",
      name: "Intercity Bus Co",
      phone: "+27 11 111 2222",
      password,
      role: "bus_operator",
      busOperatorVerificationStatus: "approved",
      defaultStartAction: "bus_operator",
      emailVerified: true,
      phoneVerified: true,
    },
  });

  await prisma.operatorVerification.upsert({
    where: { userId_operatorType: { userId: busOperator.id, operatorType: "bus_operator" } },
    update: { status: "approved", reviewedAt: new Date() },
    create: {
      userId: busOperator.id,
      operatorType: "bus_operator",
      companyName: "Intercity Bus Co",
      registrationNumber: "CK2024/123456/07",
      status: "approved",
      idDocument: "operator_id_placeholder.pdf",
      permitDocument: "operator_permit_placeholder.pdf",
      reviewedAt: new Date(),
    },
  });

  const taxiOperator = await prisma.user.upsert({
    where: { email: "taxi@vayasa.co.za" },
    update: {
      role: "taxi_operator",
      taxiOperatorVerificationStatus: "approved",
      defaultStartAction: "taxi_operator",
    },
    create: {
      email: "taxi@vayasa.co.za",
      name: "Limpopo Taxi Rank",
      phone: "+27 15 333 4444",
      password,
      role: "taxi_operator",
      taxiOperatorVerificationStatus: "approved",
      defaultStartAction: "taxi_operator",
      emailVerified: true,
      phoneVerified: true,
    },
  });

  await prisma.operatorVerification.upsert({
    where: { userId_operatorType: { userId: taxiOperator.id, operatorType: "taxi_operator" } },
    update: { status: "approved", reviewedAt: new Date() },
    create: {
      userId: taxiOperator.id,
      operatorType: "taxi_operator",
      companyName: "Limpopo Taxi Rank",
      registrationNumber: "NPO-2024-LIM",
      status: "approved",
      idDocument: "operator_id_placeholder.pdf",
      permitDocument: "operator_permit_placeholder.pdf",
      reviewedAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
      phone: "+27 87 000 0000",
      password,
      bio: "Demo account — book rides, buses, taxis, or become a driver anytime",
      role: "passenger",
      defaultStartAction: "ride",
      emailVerified: true,
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.ride.updateMany({
    where: { departureDate: { lt: today }, status: "active" },
    data: { status: "expired" },
  });

  const rides = [
    {
      driverId: createdDrivers[0].id,
      originCity: "Johannesburg", originSlug: "johannesburg",
      destinationCity: "Polokwane", destinationSlug: "polokwane",
      departureDate: addDays(today, 2), departureTime: "06:00",
      pricePerSeat: 280, seatsTotal: 3, seatsAvailable: 2,
      carModel: "VW Polo", carColor: "White",
      pickupPoint: "Sandton City, main entrance", dropoffPoint: "Polokwane Mall",
      description: "N1 north. Coffee stop at Mokopane. Non-smoking.",
    },
    {
      driverId: createdDrivers[0].id,
      originCity: "Johannesburg", originSlug: "johannesburg",
      destinationCity: "Cape Town", destinationSlug: "cape-town",
      departureDate: addDays(today, 5), departureTime: "05:30",
      pricePerSeat: 450, seatsTotal: 4, seatsAvailable: 3,
      carModel: "Toyota Corolla", carColor: "Silver",
      pickupPoint: "Park Station, Johannesburg", dropoffPoint: "Cape Town CBD",
      description: "Early departure. Experienced long-distance driver.",
    },
    {
      driverId: createdDrivers[1].id,
      originCity: "Johannesburg", originSlug: "johannesburg",
      destinationCity: "Durban", destinationSlug: "durban",
      departureDate: addDays(today, 3), departureTime: "05:00",
      pricePerSeat: 400, seatsTotal: 4, seatsAvailable: 2,
      carModel: "Mercedes-Benz C-Class", carColor: "Silver",
      pickupPoint: "Midrand Mall", dropoffPoint: "Durban North",
      description: "Premium comfort. Snacks included.",
    },
    {
      driverId: createdDrivers[2].id,
      originCity: "Durban", originSlug: "durban",
      destinationCity: "Johannesburg", destinationSlug: "johannesburg",
      departureDate: addDays(today, 1), departureTime: "08:00",
      pricePerSeat: 350, seatsTotal: 4, seatsAvailable: 4,
      carModel: "Toyota Fortuner", carColor: "Grey",
      pickupPoint: "Gateway Mall, Durban", dropoffPoint: "Rosebank Mall",
      description: "Via N3. Spacious vehicle, great for families.",
    },
    {
      driverId: createdDrivers[3].id,
      originCity: "Pretoria", originSlug: "pretoria",
      destinationCity: "Polokwane", destinationSlug: "polokwane",
      departureDate: addDays(today, 2), departureTime: "09:00",
      pricePerSeat: 220, seatsTotal: 3, seatsAvailable: 3,
      carModel: "Ford Ranger", carColor: "White",
      pickupPoint: "Menlyn Park", dropoffPoint: "Polokwane CBD",
      description: "Scenic route along the N1.",
    },
    {
      driverId: createdDrivers[4].id,
      originCity: "Polokwane", originSlug: "polokwane",
      destinationCity: "Musina", destinationSlug: "musina",
      departureDate: addDays(today, 4), departureTime: "07:00",
      pricePerSeat: 180, seatsTotal: 4, seatsAvailable: 3,
      carModel: "Isuzu D-Max", carColor: "Black",
      pickupPoint: "Polokwane CBD", dropoffPoint: "Musina border post area",
      description: "Border route specialist.",
    },
    {
      driverId: createdDrivers[1].id,
      originCity: "Cape Town", originSlug: "cape-town",
      destinationCity: "George", destinationSlug: "george",
      departureDate: addDays(today, 1), departureTime: "10:00",
      pricePerSeat: 150, seatsTotal: 3, seatsAvailable: 3,
      carModel: "VW T-Cross", carColor: "Red",
      pickupPoint: "Cape Town CBD", dropoffPoint: "George Mall",
      description: "Garden Route day trip. Beautiful coastal views.",
      womenOnly: true,
    },
  ];

  await prisma.ride.deleteMany({});
  for (const ride of rides) {
    await prisma.ride.create({ data: ride });
  }

  await prisma.busSchedule.deleteMany({});
  await prisma.busRoute.deleteMany({});
  await prisma.bus.deleteMany({});
  await prisma.taxiDeparture.deleteMany({});
  await prisma.taxiRoute.deleteMany({});

  const bus = await prisma.bus.create({
    data: {
      operatorId: busOperator.id,
      name: "VayaSA Express 01",
      registrationNumber: "CA 123-456",
      seatCapacity: 45,
    },
  });

  const busRoute = await prisma.busRoute.create({
    data: {
      operatorId: busOperator.id,
      originCity: "Johannesburg",
      originSlug: "johannesburg",
      destinationCity: "Polokwane",
      destinationSlug: "polokwane",
      pricePerSeat: 320,
    },
  });

  await prisma.busSchedule.create({
    data: {
      routeId: busRoute.id,
      busId: bus.id,
      departureDate: addDays(today, 2),
      departureTime: "05:30",
      seatsAvailable: 45,
    },
  });

  const taxiRoute = await prisma.taxiRoute.create({
    data: {
      operatorId: taxiOperator.id,
      originCity: "Polokwane",
      originSlug: "polokwane",
      destinationCity: "Musina",
      destinationSlug: "musina",
      pricePerSeat: 120,
    },
  });

  await prisma.taxiDeparture.create({
    data: {
      routeId: taxiRoute.id,
      departureDate: addDays(today, 1),
      departureTime: "06:00",
      seatsTotal: 14,
      seatsAvailable: 14,
    },
  });

  console.log(`Seeded ${CITIES.length} cities, ${drivers.length + 4} users, ${rides.length} rides, bus & taxi sample data`);
  console.log("\nDemo accounts:");
  console.log("  demo@example.com / password123 — passenger (rides, buses, taxis)");
  console.log("  thabo@example.com / password123 — verified driver");
  console.log("  bus@vayasa.co.za / password123 — bus operator");
  console.log("  taxi@vayasa.co.za / password123 — taxi operator");
  console.log("  admin@vayasa.co.za / password123 — admin");
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
