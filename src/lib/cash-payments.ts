import { prisma } from "./db";
import { processPayment } from "./payments";
import type { PaymentReferenceType } from "./payments";

export async function reserveCashPayment(params: {
  referenceType: PaymentReferenceType;
  referenceId: string;
  userId: string;
}) {
  const data = { paymentStatus: "pending_cash" as const };

  switch (params.referenceType) {
    case "booking":
      await prisma.booking.updateMany({
        where: { id: params.referenceId, passengerId: params.userId },
        data: data,
      });
      break;
    case "bus_booking":
      await prisma.busBooking.updateMany({
        where: { id: params.referenceId, passengerId: params.userId },
        data: data,
      });
      break;
    case "taxi_booking":
      await prisma.taxiBooking.updateMany({
        where: { id: params.referenceId, passengerId: params.userId },
        data: data,
      });
      break;
  }

  return { ok: true as const, paymentStatus: "pending_cash" as const };
}

export async function confirmCashPayment(params: {
  referenceType: PaymentReferenceType;
  referenceId: string;
  collectedByUserId: string;
}) {
  let amount = 0;
  let passengerId = "";

  if (params.referenceType === "bus_booking") {
    const booking = await prisma.busBooking.findUnique({
      where: { id: params.referenceId },
      include: { schedule: { include: { route: true } } },
    });
    if (!booking || booking.schedule.route.operatorId !== params.collectedByUserId) {
      return { error: "Forbidden" as const };
    }
    if (booking.paymentStatus !== "pending_cash") {
      return { error: "Not a cash booking" as const };
    }
    amount = booking.totalPrice;
    passengerId = booking.passengerId;
  } else if (params.referenceType === "taxi_booking") {
    const booking = await prisma.taxiBooking.findUnique({
      where: { id: params.referenceId },
      include: { departure: { include: { route: true } } },
    });
    if (!booking || booking.departure.route.operatorId !== params.collectedByUserId) {
      return { error: "Forbidden" as const };
    }
    if (booking.paymentStatus !== "pending_cash") {
      return { error: "Not a cash booking" as const };
    }
    amount = booking.totalPrice;
    passengerId = booking.passengerId;
  } else {
    const booking = await prisma.booking.findUnique({
      where: { id: params.referenceId },
      include: { ride: true },
    });
    if (!booking || booking.ride.driverId !== params.collectedByUserId) {
      return { error: "Forbidden" as const };
    }
    if (booking.paymentStatus !== "pending_cash") {
      return { error: "Not a cash booking" as const };
    }
    amount = booking.totalPrice;
    passengerId = booking.passengerId;
  }

  await processPayment({
    userId: passengerId,
    amount,
    method: "cash_rank",
    referenceType: params.referenceType,
    referenceId: params.referenceId,
  });

  return { ok: true as const };
}
