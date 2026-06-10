import { prisma } from "./db";
import { applyPromoCode } from "./promo";
import { notifyUser } from "./notifications";
import { getAppUrl } from "./app-config";

export type PaymentReferenceType = "booking" | "bus_booking" | "taxi_booking";

export async function getCommissionRate(): Promise<number> {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
  });
  return settings?.commissionRate ?? 0.1;
}

async function markBookingPaid(
  referenceType: PaymentReferenceType,
  referenceId: string,
  promoCode?: string,
  discountAmount?: number
) {
  const paidData = {
    paymentStatus: "paid",
    status: "paid",
    promoCode,
    discountAmount: discountAmount ?? 0,
  };

  switch (referenceType) {
    case "booking":
      await prisma.booking.update({
        where: { id: referenceId },
        data: { ...paidData, chatEnabled: true },
      });
      break;
    case "bus_booking":
      await prisma.busBooking.update({ where: { id: referenceId }, data: paidData });
      break;
    case "taxi_booking":
      await prisma.taxiBooking.update({ where: { id: referenceId }, data: paidData });
      break;
  }
}

export async function processPayment(params: {
  userId: string;
  amount: number;
  method: string;
  referenceType: PaymentReferenceType;
  referenceId: string;
  externalRef?: string;
  promoCode?: string;
  discountAmount?: number;
}) {
  const commissionRate = await getCommissionRate();
  const commissionAmount = Math.round(params.amount * commissionRate);

  const payment = await prisma.payment.create({
    data: {
      userId: params.userId,
      amount: params.amount,
      method: params.method,
      status: "completed",
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      commissionAmount,
      externalRef: params.externalRef,
    },
  });

  await markBookingPaid(
    params.referenceType,
    params.referenceId,
    params.promoCode,
    params.discountAmount
  );

  if (params.promoCode) {
    await applyPromoCode(params.promoCode);
  }

  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (user) {
    let body = `Your VayaSA payment of ${params.amount} ZAR was successful.`;
    if (params.referenceType === "booking") {
      body += " Chat is now unlocked.";
    } else if (params.referenceType === "bus_booking") {
      const ticket = await prisma.busBooking.findUnique({
        where: { id: params.referenceId },
        select: { ticketToken: true },
      });
      if (ticket) {
        body += ` Your bus ticket: ${getAppUrl()}/ticket/${ticket.ticketToken}`;
      }
    } else if (params.referenceType === "taxi_booking") {
      const ticket = await prisma.taxiBooking.findUnique({
        where: { id: params.referenceId },
        select: { ticketToken: true },
      });
      if (ticket) {
        body += ` Your taxi ticket: ${getAppUrl()}/ticket/${ticket.ticketToken}`;
      }
    }

    await notifyUser({
      userId: user.id,
      email: user.email,
      phone: user.phone,
      subject: "Payment confirmed",
      body,
      whatsapp: true,
    });
  }

  return payment;
}

export async function validatePaymentRequest(params: {
  userId: string;
  referenceType: PaymentReferenceType;
  referenceId: string;
  amount: number;
}) {
  if (params.referenceType === "booking") {
    const booking = await prisma.booking.findUnique({
      where: { id: params.referenceId },
      include: { ride: true },
    });
    if (!booking || booking.passengerId !== params.userId) {
      return { valid: false as const, error: "Booking not found" };
    }
    if (booking.status !== "accepted") {
      return { valid: false as const, error: "Booking must be accepted first" };
    }
    if (booking.paymentStatus === "paid") {
      return { valid: false as const, error: "Already paid" };
    }
    if (booking.totalPrice !== params.amount) {
      return { valid: false as const, error: "Amount mismatch" };
    }
    return { valid: true as const };
  }

  if (params.referenceType === "bus_booking") {
    const booking = await prisma.busBooking.findUnique({ where: { id: params.referenceId } });
    if (!booking || booking.passengerId !== params.userId) {
      return { valid: false as const, error: "Bus booking not found" };
    }
    if (booking.status !== "accepted") {
      return { valid: false as const, error: "Booking must be accepted first" };
    }
    if (booking.paymentStatus === "paid") {
      return { valid: false as const, error: "Already paid" };
    }
    if (booking.totalPrice !== params.amount) {
      return { valid: false as const, error: "Amount mismatch" };
    }
    return { valid: true as const };
  }

  const booking = await prisma.taxiBooking.findUnique({ where: { id: params.referenceId } });
  if (!booking || booking.passengerId !== params.userId) {
    return { valid: false as const, error: "Taxi booking not found" };
  }
  if (booking.status !== "accepted") {
    return { valid: false as const, error: "Booking must be accepted first" };
  }
  if (booking.paymentStatus === "paid") {
    return { valid: false as const, error: "Already paid" };
  }
  if (booking.totalPrice !== params.amount) {
    return { valid: false as const, error: "Amount mismatch" };
  }
  return { valid: true as const };
}
