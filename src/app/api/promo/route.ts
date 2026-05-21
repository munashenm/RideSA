import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { validatePromoCode } from "@/lib/promo";

export { dynamic } from "@/lib/dynamic-api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, amount } = z
      .object({ code: z.string(), amount: z.number().min(1) })
      .parse(body);

    const result = await validatePromoCode(code, amount);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid promo" }, { status: 500 });
  }
}
