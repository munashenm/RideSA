import { prisma } from "./db";
import { getCommissionRate } from "./payments";

export async function calculateDriverEarnings(driverId: string) {
  const rides = await prisma.ride.findMany({
    where: { driverId },
    select: { id: true },
  });
  const rideIds = rides.map((r) => r.id);

  const [bookingPayments, parcelPayments] = await Promise.all([
    prisma.payment.findMany({
      where: {
        status: "completed",
        referenceType: "booking",
        referenceId: { in: await prisma.booking.findMany({ where: { rideId: { in: rideIds } }, select: { id: true } }).then((b) => b.map((x) => x.id)) },
      },
    }),
    prisma.payment.findMany({
      where: {
        status: "completed",
        referenceType: "parcel",
        referenceId: { in: await prisma.parcelBooking.findMany({ where: { rideId: { in: rideIds } }, select: { id: true } }).then((p) => p.map((x) => x.id)) },
      },
    }),
  ]);

  const all = [...bookingPayments, ...parcelPayments];
  const gross = all.reduce((s, p) => s + p.amount, 0);
  const commission = all.reduce((s, p) => s + p.commissionAmount, 0);
  return { gross, commission, net: gross - commission, paymentCount: all.length };
}

export async function createDriverPayout(driverId: string, periodDays = 7) {
  const existing = await prisma.payout.findFirst({
    where: { driverId, status: { in: ["pending", "processing"] } },
  });
  if (existing) {
    return { error: "You already have a payout request being processed" };
  }

  const periodEnd = new Date();
  const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const { net } = await calculateDriverEarnings(driverId);
  if (net <= 0) {
    return { error: "No earnings to payout" };
  }

  const driver = await prisma.user.findUnique({ where: { id: driverId } });
  if (!driver?.bankAccountNumber || !driver.bankAccountName || !driver.bankName) {
    return { error: "Add your full bank details on your profile first" };
  }

  const payout = await prisma.payout.create({
    data: {
      driverId,
      amount: net,
      status: "pending",
      periodStart,
      periodEnd,
      bankRef: `VAYA-${Date.now()}`,
    },
  });

  return { payout };
}

export async function listPendingPayouts() {
  return prisma.payout.findMany({
    where: { status: { in: ["pending", "processing"] } },
    include: {
      driver: {
        select: {
          name: true,
          email: true,
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

export async function listDriverPayouts(driverId: string) {
  return prisma.payout.findMany({
    where: { driverId },
    orderBy: { createdAt: "desc" },
  });
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

// re-export for earnings page
export { getCommissionRate };
