import { NextResponse } from "next/server";
import { destroySession, getSessionUser } from "@/lib/auth";

export { dynamic } from "@/lib/dynamic-api";
export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user });
}
