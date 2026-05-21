import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export { dynamic } from "@/lib/dynamic-api";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blocks = await prisma.userBlock.findMany({
    where: { blockerId: user.id },
    select: { blockedId: true, createdAt: true },
  });

  return NextResponse.json({ blocks });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { blockedUserId } = z.object({ blockedUserId: z.string() }).parse(await request.json());
    if (blockedUserId === user.id) {
      return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
    }

    await prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId: user.id, blockedId: blockedUserId } },
      update: {},
      create: { blockerId: user.id, blockedId: blockedUserId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to block user" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blockedUserId = request.nextUrl.searchParams.get("userId");
  if (!blockedUserId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  await prisma.userBlock.deleteMany({
    where: { blockerId: user.id, blockedId: blockedUserId },
  });

  return NextResponse.json({ success: true });
}
