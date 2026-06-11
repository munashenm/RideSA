import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, requireAdmin } from "@/lib/auth";
import { notifyVerificationDecision } from "@/lib/notifications";
import { listPendingRefunds, processBookingRefund } from "@/lib/refunds";
import { adminReviewIdVerification } from "@/lib/id-verification";

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
    busBookings,
    taxiBookings,
    driverApplications,
    operatorApplications,
    reports,
    disputes,
    payments,
    pendingPayouts,
    pendingRefunds,
    idVerifications,
    totalTrips,
    activeTrips,
    completedTrips,
    totalRevenue,
    busTicketsSold,
    taxiTicketsSold,
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
        role: true,
        driverVerificationStatus: true,
        busOperatorVerificationStatus: true,
        taxiOperatorVerificationStatus: true,
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
      include: { driver: { select: { name: true } }, _count: { select: { bookings: true } } },
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
    prisma.busBooking.findMany({
      include: {
        passenger: { select: { name: true } },
        schedule: { include: { route: { select: { originCity: true, destinationCity: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.taxiBooking.findMany({
      include: {
        passenger: { select: { name: true } },
        departure: { include: { route: { select: { originCity: true, destinationCity: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.driverVerification.findMany({
      where: { status: "pending" },
      include: { user: { select: { name: true, email: true, phone: true } } },
    }),
    prisma.operatorVerification.findMany({
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
    prisma.payout.findMany({
      where: { status: { in: ["pending", "processing"] } },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
            bankAccountName: true,
            bankAccountNumber: true,
            bankName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    listPendingRefunds(),
    prisma.idVerification.findMany({
      where: { status: { in: ["pending", "failed"] } },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, identityVerified: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.ride.count(),
    prisma.ride.count({ where: { tripStatus: { in: ["scheduled", "in_transit"] } } }),
    prisma.ride.count({ where: { tripStatus: "completed" } }),
    prisma.payment.aggregate({
      where: { status: "completed" },
      _sum: { amount: true, commissionAmount: true },
    }),
    prisma.busBooking.count({ where: { paymentStatus: "paid" } }),
    prisma.taxiBooking.count({ where: { paymentStatus: "paid" } }),
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
    busBookings,
    taxiBookings,
    driverApplications,
    operatorApplications,
    reports,
    disputes,
    payments,
    pendingPayouts,
    pendingRefunds,
    idVerifications,
    settings,
    analytics: {
      totalTrips,
      activeTrips,
      completedTrips,
      revenue: totalRevenue._sum.amount ?? 0,
      commission: totalRevenue._sum.commissionAmount ?? 0,
      busTicketsSold,
      taxiTicketsSold,
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
        include: { user: { select: { id: true, email: true, phone: true } } },
      });
      await prisma.user.update({
        where: { id: verification.userId },
        data: {
          isDriver: true,
          driverVerificationStatus: "approved",
          identityVerified: true,
        },
      });
      await notifyVerificationDecision({
        userId: verification.user.id,
        email: verification.user.email,
        phone: verification.user.phone,
        applicationType: "driver",
        approved: true,
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
        include: { user: { select: { id: true, email: true, phone: true } } },
      });
      await prisma.user.update({
        where: { id: verification.userId },
        data: {
          isDriver: false,
          driverVerificationStatus: "rejected",
        },
      });
      await notifyVerificationDecision({
        userId: verification.user.id,
        email: verification.user.email,
        phone: verification.user.phone,
        applicationType: "driver",
        approved: false,
        reason: verification.rejectionReason ?? undefined,
      });
      return NextResponse.json({ verification });
    }
    case "approve_operator": {
      const verification = await prisma.operatorVerification.update({
        where: { id },
        data: { status: "approved", reviewedAt: new Date(), adminNotes: data?.notes, rejectionReason: null },
        include: { user: { select: { id: true, email: true, phone: true } } },
      });
      const statusField =
        verification.operatorType === "bus_operator"
          ? { busOperatorVerificationStatus: "approved" as const }
          : { taxiOperatorVerificationStatus: "approved" as const };
      await prisma.user.update({
        where: { id: verification.userId },
        data: {
          role: verification.operatorType,
          ...statusField,
        },
      });
      await notifyVerificationDecision({
        userId: verification.user.id,
        email: verification.user.email,
        phone: verification.user.phone,
        applicationType: verification.operatorType as "bus_operator" | "taxi_operator",
        approved: true,
      });
      return NextResponse.json({ verification });
    }
    case "reject_operator": {
      const verification = await prisma.operatorVerification.update({
        where: { id },
        data: {
          status: "rejected",
          reviewedAt: new Date(),
          adminNotes: data?.notes,
          rejectionReason: data?.reason ?? data?.notes ?? "Application rejected",
        },
        include: { user: { select: { id: true, email: true, phone: true } } },
      });
      const statusField =
        verification.operatorType === "bus_operator"
          ? { busOperatorVerificationStatus: "rejected" as const }
          : { taxiOperatorVerificationStatus: "rejected" as const };
      await prisma.user.update({
        where: { id: verification.userId },
        data: statusField,
      });
      await notifyVerificationDecision({
        userId: verification.user.id,
        email: verification.user.email,
        phone: verification.user.phone,
        applicationType: verification.operatorType as "bus_operator" | "taxi_operator",
        approved: false,
        reason: verification.rejectionReason ?? undefined,
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
    case "mark_payout_paid": {
      const payout = await prisma.payout.update({
        where: { id },
        data: {
          status: "paid",
          bankRef: data?.bankRef ?? `ADMIN-${Date.now()}`,
        },
      });
      return NextResponse.json({ payout });
    }
    case "process_refund": {
      const referenceType = data?.referenceType as "booking" | "bus_booking" | "taxi_booking";
      if (!referenceType) {
        return NextResponse.json({ error: "referenceType required" }, { status: 400 });
      }
      const result = await processBookingRefund({ referenceType, referenceId: id });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ result });
    }
    case "mark_refund_manual": {
      const referenceType = data?.referenceType as "booking" | "bus_booking" | "taxi_booking";
      if (!referenceType) {
        return NextResponse.json({ error: "referenceType required" }, { status: 400 });
      }
      switch (referenceType) {
        case "booking":
          await prisma.booking.update({ where: { id }, data: { refundStatus: "refunded" } });
          break;
        case "bus_booking":
          await prisma.busBooking.update({ where: { id }, data: { refundStatus: "refunded" } });
          break;
        case "taxi_booking":
          await prisma.taxiBooking.update({ where: { id }, data: { refundStatus: "refunded" } });
          break;
      }
      return NextResponse.json({ ok: true });
    }
    case "approve_id": {
      const result = await adminReviewIdVerification({ userId: id, approved: true });
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }
    case "reject_id": {
      const result = await adminReviewIdVerification({
        userId: id,
        approved: false,
        reason: data?.reason,
      });
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
