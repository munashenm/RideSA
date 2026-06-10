import { prisma } from "./db";
import { refundPaystackTransaction, isPaystackConfigured } from "./paystack";
import { notifyUser } from "./notifications";
import type { PaymentReferenceType } from "./payments";

export type RefundReferenceType = PaymentReferenceType;

async function resolvePaystackTransactionRef(
  referenceType: RefundReferenceType,
  referenceId: string
): Promise<string | null> {
  const payment = await prisma.payment.findFirst({
    where: { referenceType, referenceId, status: "completed" },
    orderBy: { createdAt: "desc" },
  });
  if (payment?.externalRef) return payment.externalRef;

  const intent = await prisma.paymentIntent.findFirst({
    where: { referenceType, referenceId, status: "completed" },
    orderBy: { createdAt: "desc" },
  });
  if (intent?.externalRef) return intent.externalRef;
  if (intent?.id) return intent.id;

  return null;
}

async function setRefundStatus(
  referenceType: RefundReferenceType,
  referenceId: string,
  refundStatus: string
) {
  switch (referenceType) {
    case "booking":
      await prisma.booking.update({ where: { id: referenceId }, data: { refundStatus } });
      break;
    case "bus_booking":
      await prisma.busBooking.update({ where: { id: referenceId }, data: { refundStatus } });
      break;
    case "taxi_booking":
      await prisma.taxiBooking.update({ where: { id: referenceId }, data: { refundStatus } });
      break;
  }
}

async function getPassengerId(
  referenceType: RefundReferenceType,
  referenceId: string
): Promise<string | null> {
  switch (referenceType) {
    case "booking": {
      const b = await prisma.booking.findUnique({ where: { id: referenceId }, select: { passengerId: true } });
      return b?.passengerId ?? null;
    }
    case "bus_booking": {
      const b = await prisma.busBooking.findUnique({ where: { id: referenceId }, select: { passengerId: true } });
      return b?.passengerId ?? null;
    }
    case "taxi_booking": {
      const b = await prisma.taxiBooking.findUnique({ where: { id: referenceId }, select: { passengerId: true } });
      return b?.passengerId ?? null;
    }
  }
}

export async function processBookingRefund(params: {
  referenceType: RefundReferenceType;
  referenceId: string;
}) {
  const payment = await prisma.payment.findFirst({
    where: {
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      status: "completed",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!payment) {
    await setRefundStatus(params.referenceType, params.referenceId, "none");
    return { ok: false as const, error: "no_payment" as const };
  }

  const passengerId = await getPassengerId(params.referenceType, params.referenceId);
  const user = passengerId
    ? await prisma.user.findUnique({ where: { id: passengerId } })
    : null;

  if (isPaystackConfigured() && payment.method === "paystack") {
    const transactionRef = await resolvePaystackTransactionRef(
      params.referenceType,
      params.referenceId
    );

    if (!transactionRef) {
      await setRefundStatus(params.referenceType, params.referenceId, "pending");
      return { ok: false as const, error: "no_transaction_ref" as const };
    }

    const result = await refundPaystackTransaction(transactionRef, payment.amount);
    if (!result.ok) {
      await setRefundStatus(params.referenceType, params.referenceId, "pending");
      return { ok: false as const, error: result.error };
    }

    await setRefundStatus(params.referenceType, params.referenceId, "refunded");

    if (user) {
      await notifyUser({
        userId: user.id,
        email: user.email,
        phone: user.phone,
        subject: "Refund processed",
        body: `Your VayaSA refund of ${payment.amount} ZAR has been processed and should reflect in your account shortly.`,
        whatsapp: true,
      });
    }

    return { ok: true as const, mode: "paystack" as const };
  }

  await setRefundStatus(params.referenceType, params.referenceId, "refunded");

  if (user) {
    await notifyUser({
      userId: user.id,
      email: user.email,
      phone: user.phone,
      subject: "Refund processed",
      body: `Your VayaSA refund of ${payment.amount} ZAR has been processed.`,
      whatsapp: true,
    });
  }

  return { ok: true as const, mode: "demo" as const };
}

export async function listPendingRefunds() {
  const [bus, taxi, rides] = await Promise.all([
    prisma.busBooking.findMany({
      where: { refundStatus: "pending" },
      include: {
        passenger: { select: { name: true, email: true } },
        schedule: { include: { route: { select: { originCity: true, destinationCity: true } } } },
      },
      orderBy: { cancelledAt: "desc" },
      take: 50,
    }),
    prisma.taxiBooking.findMany({
      where: { refundStatus: "pending" },
      include: {
        passenger: { select: { name: true, email: true } },
        departure: { include: { route: { select: { originCity: true, destinationCity: true } } } },
      },
      orderBy: { cancelledAt: "desc" },
      take: 50,
    }),
    prisma.booking.findMany({
      where: { refundStatus: "pending" },
      include: {
        passenger: { select: { name: true, email: true } },
        ride: { select: { originCity: true, destinationCity: true } },
      },
      orderBy: { cancelledAt: "desc" },
      take: 50,
    }),
  ]);

  return { bus, taxi, rides };
}
