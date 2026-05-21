import { prisma } from "./db";

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
    },
  });

  if (params.referenceType === "booking") {
    await prisma.booking.update({
      where: { id: params.referenceId },
      data: {
        paymentStatus: "paid",
        status: "paid",
        chatEnabled: true,
      },
    });
  } else {
    await prisma.parcelBooking.update({
      where: { id: params.referenceId },
      data: {
        paymentStatus: "paid",
        chatEnabled: true,
      },
    });
  }

  return payment;
}
