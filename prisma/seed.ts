import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
  console.log("Seeding RideSA database...");

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

  const password = await bcrypt.hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "admin@ridesa.co.za" },
    update: { isAdmin: true },
    create: {
      email: "admin@ridesa.co.za",
      name: "RideSA Admin",
      phone: "+27 11 000 0000",
      password,
      isAdmin: true,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const drivers = [
    { email: "thabo@example.com", name: "Thabo Mokoena", phone: "+27 82 123 4567", bio: "Verified driver. JHB–CPT regular. Non-smoker.", vehicleModel: "VW Polo", vehicleColor: "White" },
    { email: "sarah@example.com", name: "Sarah van der Merwe", phone: "+27 83 234 5678", bio: "10+ years experience. Pet-friendly.", vehicleModel: "Toyota Fortuner", vehicleColor: "Grey" },
    { email: "zanele@example.com", name: "Zanele Dlamini", phone: "+27 84 345 6789", bio: "Durban–JHB weekly. Parcel-friendly.", vehicleModel: "Hyundai Tucson", vehicleColor: "Blue" },
    { email: "johan@example.com", name: "Johan Botha", phone: "+27 85 456 7890", bio: "Pretoria–Polokwane specialist.", vehicleModel: "Ford Ranger", vehicleColor: "White" },
    { email: "nomsa@example.com", name: "Nomsa Khumalo", phone: "+27 86 567 8901", bio: "Limpopo routes. Extra parcel space.", vehicleModel: "Isuzu D-Max", vehicleColor: "Black" },
  ];

  const createdDrivers = [];
  for (const driver of drivers) {
    const user = await prisma.user.upsert({
      where: { email: driver.email },
      update: {
        isDriver: true,
        driverVerificationStatus: "approved",
      },
      create: {
        email: driver.email,
        name: driver.name,
        phone: driver.phone,
        password,
        bio: driver.bio,
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

  await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
      phone: "+27 87 000 0000",
      password,
      bio: "Demo account — book rides, send parcels, or become a driver anytime",
      defaultStartAction: "ride",
      emailVerified: true,
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rides = [
    {
      driverId: createdDrivers[0].id,
      originCity: "Johannesburg", originSlug: "johannesburg",
      destinationCity: "Polokwane", destinationSlug: "polokwane",
      departureDate: addDays(today, 2), departureTime: "06:00",
      pricePerSeat: 280, seatsTotal: 3, seatsAvailable: 2,
      carModel: "VW Polo", carColor: "White",
      parcelSpaceTotal: 2, parcelSpaceAvailable: 2, parcelPrice: 150, maxParcelWeight: 20, maxParcelSize: "medium",
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
      parcelSpaceTotal: 1, parcelSpaceAvailable: 1, parcelPrice: 200, maxParcelWeight: 15, maxParcelSize: "small",
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
      parcelSpaceTotal: 3, parcelSpaceAvailable: 2, parcelPrice: 180, maxParcelWeight: 25, maxParcelSize: "large",
      pickupPoint: "Midrand Mall", dropoffPoint: "Durban North",
      description: "Premium comfort. Snacks included. Parcel space available.",
    },
    {
      driverId: createdDrivers[2].id,
      originCity: "Durban", originSlug: "durban",
      destinationCity: "Johannesburg", destinationSlug: "johannesburg",
      departureDate: addDays(today, 1), departureTime: "08:00",
      pricePerSeat: 350, seatsTotal: 4, seatsAvailable: 4,
      carModel: "Toyota Fortuner", carColor: "Grey",
      parcelSpaceTotal: 2, parcelSpaceAvailable: 2, parcelPrice: 160, maxParcelWeight: 30, maxParcelSize: "large",
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
      parcelSpaceTotal: 4, parcelSpaceAvailable: 4, parcelPrice: 120, maxParcelWeight: 40, maxParcelSize: "large",
      pickupPoint: "Menlyn Park", dropoffPoint: "Polokwane CBD",
      description: "Bakkie with extra parcel space. Scenic route.",
    },
    {
      driverId: createdDrivers[4].id,
      originCity: "Polokwane", originSlug: "polokwane",
      destinationCity: "Musina", destinationSlug: "musina",
      departureDate: addDays(today, 4), departureTime: "07:00",
      pricePerSeat: 180, seatsTotal: 4, seatsAvailable: 3,
      carModel: "Isuzu D-Max", carColor: "Black",
      parcelSpaceTotal: 5, parcelSpaceAvailable: 4, parcelPrice: 100, maxParcelWeight: 50, maxParcelSize: "large",
      pickupPoint: "Polokwane CBD", dropoffPoint: "Musina border post area",
      description: "Border route specialist. Heavy parcels welcome.",
    },
    {
      driverId: createdDrivers[4].id,
      originCity: "Johannesburg", originSlug: "johannesburg",
      destinationCity: "Musina", destinationSlug: "musina",
      departureDate: addDays(today, 6), departureTime: "04:30",
      pricePerSeat: 350, seatsTotal: 3, seatsAvailable: 2,
      carModel: "Isuzu D-Max", carColor: "Black",
      parcelSpaceTotal: 3, parcelSpaceAvailable: 2, parcelPrice: 250, maxParcelWeight: 40, maxParcelSize: "large",
      pickupPoint: "Centurion Mall", dropoffPoint: "Musina town",
      description: "Direct N1 to Musina. Overnight parcels accepted.",
    },
    {
      driverId: createdDrivers[1].id,
      originCity: "Durban", originSlug: "durban",
      destinationCity: "Cape Town", destinationSlug: "cape-town",
      departureDate: addDays(today, 7), departureTime: "06:00",
      pricePerSeat: 520, seatsTotal: 3, seatsAvailable: 3,
      carModel: "BMW X3", carColor: "Black",
      parcelSpaceTotal: 1, parcelSpaceAvailable: 1, parcelPrice: 300, maxParcelWeight: 10, maxParcelSize: "small",
      pickupPoint: "Umhlanga", dropoffPoint: "V&A Waterfront",
      description: "Coastal route via N2. Comfortable SUV.",
    },
    {
      driverId: createdDrivers[1].id,
      originCity: "Cape Town", originSlug: "cape-town",
      destinationCity: "George", destinationSlug: "george",
      departureDate: addDays(today, 1), departureTime: "10:00",
      pricePerSeat: 150, seatsTotal: 3, seatsAvailable: 3,
      carModel: "VW T-Cross", carColor: "Red",
      parcelSpaceTotal: 2, parcelSpaceAvailable: 2, parcelPrice: 80, maxParcelWeight: 15, maxParcelSize: "medium",
      pickupPoint: "Cape Town CBD", dropoffPoint: "George Mall",
      description: "Garden Route day trip. Beautiful coastal views.",
    },
    {
      driverId: createdDrivers[3].id,
      originCity: "Pretoria", originSlug: "pretoria",
      destinationCity: "Mbombela", destinationSlug: "mbombela",
      departureDate: addDays(today, 6), departureTime: "07:30",
      pricePerSeat: 280, seatsTotal: 4, seatsAvailable: 4,
      carModel: "Isuzu D-Max", carColor: "Black",
      parcelSpaceTotal: 2, parcelSpaceAvailable: 2, parcelPrice: 140, maxParcelWeight: 25, maxParcelSize: "medium",
      pickupPoint: "Hatfield", dropoffPoint: "Mbombela CBD",
      description: "Kruger area. Can drop at lodges along the way.",
    },
  ];

  await prisma.ride.deleteMany({});
  for (const ride of rides) {
    await prisma.ride.create({ data: ride });
  }

  console.log(`Seeded ${CITIES.length} cities, ${drivers.length + 2} users, ${rides.length} trips`);
  console.log("\nDemo accounts (one account, all services):");
  console.log("  demo@example.com / password123 — book rides & send parcels");
  console.log("  thabo@example.com / password123 — verified driver");
  console.log("  admin@ridesa.co.za / password123 — admin only");
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
