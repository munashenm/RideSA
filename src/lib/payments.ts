import { prisma } from "./db";
import { applyPromoCode } from "./promo";
import { notifyUser } from "./notifications";

export async function getCommissionRate(): Promise<number> {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
  });
  return settings?.commissionRate ?? 0.1;
}

export async function processPayment(params: {
  userId: string;
  amount: number;
  method: string;
  referenceType: "booking" | "parcel";
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

  if (params.referenceType === "booking") {
    await prisma.booking.update({
      where: { id: params.referenceId },
      data: {
        paymentStatus: "paid",
        status: "paid",
        chatEnabled: true,
        promoCode: params.promoCode,
        discountAmount: params.discountAmount ?? 0,
      },
    });
  } else {
    await prisma.parcelBooking.update({
      where: { id: params.referenceId },
      data: {
        paymentStatus: "paid",
        chatEnabled: true,
        promoCode: params.promoCode,
        discountAmount: params.discountAmount ?? 0,
      },
    });
  }

  if (params.promoCode) {
    await applyPromoCode(params.promoCode);
  }

  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (user) {
    await notifyUser({
      userId: user.id,
      email: user.email,
      phone: user.phone,
      subject: "Payment confirmed",
      body: `Your RideSA payment of ${params.amount} ZAR was successful. Chat is now unlocked.`,
      whatsapp: true,
    });
  }

  return payment;
}

export async function validatePaymentRequest(params: {
  userId: string;
  referenceType: "booking" | "parcel";
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
    return { valid: true as const, booking };
  }

  const parcel = await prisma.parcelBooking.findUnique({
    where: { id: params.referenceId },
  });
  if (!parcel || parcel.senderId !== params.userId) {
    return { valid: false as const, error: "Parcel booking not found" };
  }
  if (parcel.status !== "accepted") {
    return { valid: false as const, error: "Parcel must be accepted first" };
  }
  if (parcel.paymentStatus === "paid") {
    return { valid: false as const, error: "Already paid" };
  }
  if (parcel.totalPrice !== params.amount) {
    return { valid: false as const, error: "Amount mismatch" };
  }
  return { valid: true as const, parcel };
}
