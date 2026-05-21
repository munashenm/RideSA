import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, requireAdmin } from "@/lib/auth";

export { dynamic } from "@/lib/dynamic-api";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    users,
    trips,
    bookings,
    parcels,
    driverApplications,
    reports,
    disputes,
    payments,
    totalTrips,
    activeTrips,
    completedTrips,
    totalRevenue,
    parcelDeliveries,
  ] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isAdmin: true,
        isDriver: true,
        driverVerificationStatus: true,
        rating: true,
        isSuspended: true,
        emailVerified: true,
        phoneVerified: true,
        identityVerified: true,
        createdAt: true,
        driverVerification: { select: { status: true } },
      },
    }),
    prisma.ride.findMany({
      include: { driver: { select: { name: true } }, _count: { select: { bookings: true, parcelBookings: true } } },
      orderBy: { departureDate: "desc" },
      take: 50,
    }),
    prisma.booking.findMany({
      include: {
        passenger: { select: { name: true } },
        ride: { select: { originCity: true, destinationCity: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.parcelBooking.findMany({
      include: {
        sender: { select: { name: true } },
        ride: { select: { originCity: true, destinationCity: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.driverVerification.findMany({
      where: { status: "pending" },
      include: { user: { select: { name: true, email: true, phone: true } } },
    }),
    prisma.report.findMany({
      where: { status: "open" },
      include: {
        reporter: { select: { name: true } },
        reportedUser: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.dispute.findMany({
      where: { status: { in: ["open", "investigating"] } },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { status: "completed" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.ride.count(),
    prisma.ride.count({ where: { tripStatus: { in: ["scheduled", "in_transit"] } } }),
    prisma.ride.count({ where: { tripStatus: "completed" } }),
    prisma.payment.aggregate({
      where: { status: "completed" },
      _sum: { amount: true, commissionAmount: true },
    }),
    prisma.parcelBooking.count({ where: { status: "delivered" } }),
  ]);

  const popularRoutes = await prisma.ride.groupBy({
    by: ["originCity", "destinationCity"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });

  const settings = await prisma.platformSettings.findUnique({ where: { id: "default" } });

  return NextResponse.json({
    users,
    trips,
    bookings,
    parcels,
    driverApplications,
    reports,
    disputes,
    payments,
    settings,
    analytics: {
      totalTrips,
      activeTrips,
      completedTrips,
      revenue: totalRevenue._sum.amount ?? 0,
      commission: totalRevenue._sum.commissionAmount ?? 0,
      parcelDeliveries,
      popularRoutes,
    },
  });
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { action, id, data } = body;

  switch (action) {
    case "approve_driver": {
      const verification = await prisma.driverVerification.update({
        where: { id },
        data: { status: "approved", reviewedAt: new Date(), adminNotes: data?.notes, rejectionReason: null },
      });
      await prisma.user.update({
        where: { id: verification.userId },
        data: {
          isDriver: true,
          driverVerificationStatus: "approved",
          identityVerified: true,
        },
      });
      return NextResponse.json({ verification });
    }
    case "reject_driver": {
      const verification = await prisma.driverVerification.update({
        where: { id },
        data: {
          status: "rejected",
          reviewedAt: new Date(),
          adminNotes: data?.notes,
          rejectionReason: data?.reason ?? data?.notes ?? "Application rejected",
        },
      });
      await prisma.user.update({
        where: { id: verification.userId },
        data: {
          isDriver: false,
          driverVerificationStatus: "rejected",
        },
      });
      return NextResponse.json({ verification });
    }
    case "suspend_user": {
      const user = await prisma.user.update({
        where: { id },
        data: { isSuspended: true },
      });
      return NextResponse.json({ user });
    }
    case "unsuspend_user": {
      const user = await prisma.user.update({
        where: { id },
        data: { isSuspended: false },
      });
      return NextResponse.json({ user });
    }
    case "resolve_dispute": {
      const dispute = await prisma.dispute.update({
        where: { id },
        data: {
          status: "resolved",
          resolution: data?.resolution,
          adminNotes: data?.notes,
        },
      });
      return NextResponse.json({ dispute });
    }
    case "resolve_report": {
      const report = await prisma.report.update({
        where: { id },
        data: { status: "resolved" },
      });
      return NextResponse.json({ report });
    }
    case "update_commission": {
      const settings = await prisma.platformSettings.update({
        where: { id: "default" },
        data: { commissionRate: data.rate },
      });
      return NextResponse.json({ settings });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
