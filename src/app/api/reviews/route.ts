import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export { dynamic } from "@/lib/dynamic-api";

const reviewSchema = z.object({
  revieweeId: z.string(),
  bookingId: z.string().optional(),
  rideId: z.string().optional(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = reviewSchema.parse(body);

    const review = await prisma.review.create({
      data: {
        reviewerId: user.id,
        revieweeId: data.revieweeId,
        bookingId: data.bookingId,
        rideId: data.rideId,
        rating: data.rating,
        comment: data.comment,
      },
    });

    if (data.bookingId) {
      await prisma.booking.update({
        where: { id: data.bookingId },
        data: { reviewed: true },
      });
    }

    const reviews = await prisma.review.findMany({
      where: { revieweeId: data.revieweeId },
    });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await prisma.user.update({
      where: { id: data.revieweeId },
      data: { rating: avgRating },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Review failed" }, { status: 500 });
  }
}
