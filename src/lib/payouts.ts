import { prisma } from "./db";
import { getCommissionRate } from "./payments";
import type { PayoutType } from "./user-permissions";

async function getPaidBookingIds(referenceType: "booking" | "bus_booking" | "taxi_booking", ids: string[]) {
  if (ids.length === 0) return [];
  return prisma.payment.findMany({
    where: {
      status: "completed",
      referenceType,
      referenceId: { in: ids },
    },
  });
}

export async function calculateDriverEarnings(driverId: string) {
  const rides = await prisma.ride.findMany({
    where: { driverId },
    select: { id: true },
  });
  const rideIds = rides.map((r) => r.id);
  const bookingIds = await prisma.booking
    .findMany({ where: { rideId: { in: rideIds } }, select: { id: true } })
    .then((b) => b.map((x) => x.id));

  const payments = await getPaidBookingIds("booking", bookingIds);
  return summarizePayments(payments);
}

export async function calculateBusOperatorEarnings(operatorId: string) {
  const bookingIds = await prisma.busBooking
    .findMany({
      where: { schedule: { route: { operatorId } }, paymentStatus: "paid" },
      select: { id: true },
    })
    .then((b) => b.map((x) => x.id));

  const payments = await getPaidBookingIds("bus_booking", bookingIds);
  return summarizePayments(payments);
}

export async function calculateTaxiOperatorEarnings(operatorId: string) {
  const bookingIds = await prisma.taxiBooking
    .findMany({
      where: { departure: { route: { operatorId } }, paymentStatus: "paid" },
      select: { id: true },
    })
    .then((b) => b.map((x) => x.id));

  const payments = await getPaidBookingIds("taxi_booking", bookingIds);
  return summarizePayments(payments);
}

function summarizePayments(payments: { amount: number; commissionAmount: number }[]) {
  const gross = payments.reduce((s, p) => s + p.amount, 0);
  const commission = payments.reduce((s, p) => s + p.commissionAmount, 0);
  return { gross, commission, net: gross - commission, paymentCount: payments.length };
}

export async function calculateEarnings(userId: string, payoutType: PayoutType) {
  switch (payoutType) {
    case "bus_operator":
      return calculateBusOperatorEarnings(userId);
    case "taxi_operator":
      return calculateTaxiOperatorEarnings(userId);
    default:
      return calculateDriverEarnings(userId);
  }
}

export async function createPayout(userId: string, payoutType: PayoutType, periodDays = 7) {
  const existing = await prisma.payout.findFirst({
    where: { userId, payoutType, status: { in: ["pending", "processing"] } },
  });
  if (existing) {
    return { error: "You already have a payout request being processed" };
  }

  const periodEnd = new Date();
  const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
  const { net } = await calculateEarnings(userId, payoutType);

  if (net <= 0) {
    return { error: "No earnings to payout" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.bankAccountNumber || !user.bankAccountName || !user.bankName) {
    return { error: "Add your full bank details on your profile first" };
  }

  const payout = await prisma.payout.create({
    data: {
      userId,
      payoutType,
      amount: net,
      status: "pending",
      periodStart,
      periodEnd,
      bankRef: `VAYA-${Date.now()}`,
    },
  });

  return { payout };
}

export async function createDriverPayout(driverId: string, periodDays = 7) {
  return createPayout(driverId, "driver", periodDays);
}

export async function listPendingPayouts() {
  return prisma.payout.findMany({
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
  });
}

export async function markPayoutPaid(payoutId: string, bankRef?: string) {
  return prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: "paid",
      bankRef: bankRef ?? undefined,
    },
  });
}

export async function listPayouts(userId: string, payoutType: PayoutType) {
  return prisma.payout.findMany({
    where: { userId, payoutType },
    orderBy: { createdAt: "desc" },
  });
}

export async function listDriverPayouts(driverId: string) {
  return listPayouts(driverId, "driver");
}

export async function processPendingPayouts() {
  const pending = await prisma.payout.findMany({ where: { status: "pending" } });
  for (const payout of pending) {
    await prisma.payout.update({
      where: { id: payout.id },
      data: { status: "processing" },
    });
    await prisma.payout.update({
      where: { id: payout.id },
      data: { status: "paid" },
    });
  }
  return pending.length;
}

export { getCommissionRate };
