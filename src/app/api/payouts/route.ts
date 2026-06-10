import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  createPayout,
  listPayouts,
  calculateEarnings,
} from "@/lib/payouts";
import {
  isApprovedDriver,
  isApprovedBusOperator,
  isApprovedTaxiOperator,
  type PayoutType,
} from "@/lib/user-permissions";

export { dynamic } from "@/lib/dynamic-api";

function parsePayoutType(value: string | null): PayoutType {
  if (value === "bus_operator" || value === "taxi_operator") return value;
  return "driver";
}

function canAccessPayouts(user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>, type: PayoutType) {
  switch (type) {
    case "bus_operator":
      return isApprovedBusOperator(user);
    case "taxi_operator":
      return isApprovedTaxiOperator(user);
    default:
      return isApprovedDriver(user);
  }
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payoutType = parsePayoutType(request.nextUrl.searchParams.get("type"));
  if (!canAccessPayouts(user, payoutType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [earnings, payouts] = await Promise.all([
    calculateEarnings(user.id, payoutType),
    listPayouts(user.id, payoutType),
  ]);

  return NextResponse.json({ earnings, payouts, payoutType });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const payoutType = parsePayoutType(body.type ?? null);

  if (!canAccessPayouts(user, payoutType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await createPayout(user.id, payoutType);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
