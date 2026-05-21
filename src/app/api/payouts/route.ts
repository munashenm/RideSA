import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  createDriverPayout,
  listDriverPayouts,
  calculateDriverEarnings,
} from "@/lib/payouts";

export { dynamic } from "@/lib/dynamic-api";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [earnings, payouts] = await Promise.all([
    calculateDriverEarnings(user.id),
    listDriverPayouts(user.id),
  ]);

  return NextResponse.json({ earnings, payouts });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.isDriver) {
    return NextResponse.json({ error: "Driver only" }, { status: 403 });
  }

  const result = await createDriverPayout(user.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
