import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { processPayment } from "@/lib/payments";

export { dynamic } from "@/lib/dynamic-api";

const paymentSchema = z.object({
  method: z.enum(["payfast", "ozow", "card", "eft"]),
  referenceType: z.enum(["booking", "parcel"]),
  referenceId: z.string(),
  amount: z.number().min(1),
});

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = paymentSchema.parse(body);

    const payment = await processPayment({
      userId: user.id,
      amount: data.amount,
      method: data.method,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
    });

    return NextResponse.json({ payment, success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Payment failed" }, { status: 500 });
  }
}
