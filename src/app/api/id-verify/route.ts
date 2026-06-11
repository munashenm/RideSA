import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getIdVerificationForUser, verifySaId } from "@/lib/id-verification";

export { dynamic } from "@/lib/dynamic-api";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const verification = await getIdVerificationForUser(user.id);
  return NextResponse.json({
    identityVerified: user.identityVerified,
    verification,
  });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.identityVerified) {
    return NextResponse.json({ verified: true, status: "verified" });
  }

  try {
    const body = await request.json();
    const data = z
      .object({
        idNumber: z.string().min(13),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
      })
      .parse(body);

    const result = await verifySaId({
      userId: user.id,
      profileName: user.name,
      ...data,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
