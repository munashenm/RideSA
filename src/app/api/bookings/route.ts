import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export { dynamic } from "@/lib/dynamic-api";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [passengerBookings, driverBookings, parcelBookings, driverParcels] = await Promise.all([
    prisma.booking.findMany({
      where: { passengerId: user.id },
      include: {
        ride: {
          include: { driver: { select: { id: true, name: true, rating: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.findMany({
      where: { ride: { driverId: user.id } },
      include: {
        passenger: { select: { id: true, name: true, rating: true, phone: true } },
        ride: { select: { originCity: true, destinationCity: true, departureDate: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.parcelBooking.findMany({
      where: { senderId: user.id },
      include: {
        ride: {
          include: { driver: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.parcelBooking.findMany({
      where: { ride: { driverId: user.id } },
      include: {
        sender: { select: { id: true, name: true, phone: true } },
        ride: { select: { originCity: true, destinationCity: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

    return NextResponse.json({
      passengerBookings,
      driverBookings,
      parcelBookings,
      driverParcels,
    });
  } catch (error) {
    console.error("GET /api/bookings failed:", error);
    return NextResponse.json({ error: "Failed to load bookings" }, { status: 500 });
  }
}