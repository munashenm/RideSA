import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export { dynamic } from "@/lib/dynamic-api";

const patchSchema = z.object({
  ids: z.array(z.string()).optional(),
  markAllRead: z.boolean().optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id, channel: "in_app" },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({
      where: { userId: user.id, channel: "in_app", readAt: null },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = patchSchema.parse(body);
    const now = new Date();

    if (data.markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: user.id, channel: "in_app", readAt: null },
        data: { readAt: now },
      });
      return NextResponse.json({ ok: true });
    }

    if (data.ids?.length) {
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          id: { in: data.ids },
          channel: "in_app",
        },
        data: { readAt: now },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
