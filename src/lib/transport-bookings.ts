import { prisma } from "./db";
import { BOOKING_STATUS } from "./constants";
import { processBookingRefund } from "./refunds";

export const CANCEL_WINDOW_HOURS = 2;

export function hoursUntilDeparture(departureDate: Date, departureTime: string): number {
  const [hours, minutes] = departureTime.split(":").map((v) => parseInt(v, 10) || 0);
  const dep = new Date(departureDate);
  dep.setHours(hours, minutes, 0, 0);
  return (dep.getTime() - Date.now()) / (1000 * 60 * 60);
}

export function canPassengerCancel(departureDate: Date, departureTime: string): boolean {
  return hoursUntilDeparture(departureDate, departureTime) >= CANCEL_WINDOW_HOURS;
}

export async function cancelBusBooking(params: {
  bookingId: string;
  userId: string;
  asOperator?: boolean;
}) {
  const booking = await prisma.busBooking.findUnique({
    where: { id: params.bookingId },
    include: { schedule: { include: { route: true } } },
  });

  if (!booking) return { error: "Booking not found" as const };
  if (booking.status === BOOKING_STATUS.CANCELLED) {
    return { error: "Already cancelled" as const };
  }

  if (params.asOperator) {
    if (booking.schedule.route.operatorId !== params.userId) {
      return { error: "Forbidden" as const };
    }
  } else if (booking.passengerId !== params.userId) {
    return { error: "Forbidden" as const };
  } else if (!canPassengerCancel(booking.schedule.departureDate, booking.schedule.departureTime)) {
    return {
      error: `Cancel at least ${CANCEL_WINDOW_HOURS} hours before departure` as const,
    };
  }

  const wasPaid = booking.paymentStatus === "paid";

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.busBooking.update({
      where: { id: params.bookingId },
      data: {
        status: BOOKING_STATUS.CANCELLED,
        cancelledAt: new Date(),
        refundStatus: wasPaid ? "pending" : "none",
      },
    });
    await tx.busSchedule.update({
      where: { id: booking.scheduleId },
      data: { seatsAvailable: { increment: booking.seats } },
    });
    return result;
  });

  if (wasPaid) {
    await processBookingRefund({ referenceType: "bus_booking", referenceId: params.bookingId });
  }

  return { booking: updated };
}

export async function cancelTaxiBooking(params: {
  bookingId: string;
  userId: string;
  asOperator?: boolean;
}) {
  const booking = await prisma.taxiBooking.findUnique({
    where: { id: params.bookingId },
    include: { departure: { include: { route: true } } },
  });

  if (!booking) return { error: "Booking not found" as const };
  if (booking.status === BOOKING_STATUS.CANCELLED) {
    return { error: "Already cancelled" as const };
  }

  if (params.asOperator) {
    if (booking.departure.route.operatorId !== params.userId) {
      return { error: "Forbidden" as const };
    }
  } else if (booking.passengerId !== params.userId) {
    return { error: "Forbidden" as const };
  } else if (!canPassengerCancel(booking.departure.departureDate, booking.departure.departureTime)) {
    return {
      error: `Cancel at least ${CANCEL_WINDOW_HOURS} hours before departure` as const,
    };
  }

  const wasPaid = booking.paymentStatus === "paid";

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.taxiBooking.update({
      where: { id: params.bookingId },
      data: {
        status: BOOKING_STATUS.CANCELLED,
        cancelledAt: new Date(),
        refundStatus: wasPaid ? "pending" : "none",
      },
    });
    await tx.taxiDeparture.update({
      where: { id: booking.departureId },
      data: { seatsAvailable: { increment: booking.seats } },
    });
    return result;
  });

  if (wasPaid) {
    await processBookingRefund({ referenceType: "taxi_booking", referenceId: params.bookingId });
  }

  return { booking: updated };
}

export async function cancelRideBooking(params: { bookingId: string; userId: string }) {
  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: { ride: true },
  });

  if (!booking) return { error: "Booking not found" as const };
  if (booking.passengerId !== params.userId) return { error: "Forbidden" as const };
  if (booking.status === BOOKING_STATUS.CANCELLED) return { error: "Already cancelled" as const };
  if (!canPassengerCancel(booking.ride.departureDate, booking.ride.departureTime)) {
    return { error: `Cancel at least ${CANCEL_WINDOW_HOURS} hours before departure` as const };
  }

  const wasPaid = booking.paymentStatus === "paid";

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.booking.update({
      where: { id: params.bookingId },
      data: {
        status: BOOKING_STATUS.CANCELLED,
        cancelledAt: new Date(),
        refundStatus: wasPaid ? "pending" : "none",
      },
    });
    await tx.ride.update({
      where: { id: booking.rideId },
      data: { seatsAvailable: { increment: booking.seats } },
    });
    return result;
  });

  if (wasPaid) {
    await processBookingRefund({ referenceType: "booking", referenceId: params.bookingId });
  }

  return { booking: updated };
}

export async function checkInBusBooking(bookingId: string, operatorId: string) {
  const booking = await prisma.busBooking.findUnique({
    where: { id: bookingId },
    include: { schedule: { include: { route: true } } },
  });

  if (!booking || booking.schedule.route.operatorId !== operatorId) {
    return { error: "Booking not found" as const };
  }
  if (booking.paymentStatus !== "paid") {
    return { error: "Ticket must be paid before check-in" as const };
  }
  if (booking.status === BOOKING_STATUS.CANCELLED) {
    return { error: "Booking cancelled" as const };
  }

  const updated = await prisma.busBooking.update({
    where: { id: bookingId },
    data: {
      checkedInAt: new Date(),
      status: "checked_in",
    },
  });

  return { booking: updated };
}

export async function completeBusBooking(bookingId: string, operatorId: string) {
  const booking = await prisma.busBooking.findUnique({
    where: { id: bookingId },
    include: { schedule: { include: { route: true } } },
  });

  if (!booking || booking.schedule.route.operatorId !== operatorId) {
    return { error: "Booking not found" as const };
  }
  if (booking.paymentStatus !== "paid") {
    return { error: "Ticket must be paid" as const };
  }

  const updated = await prisma.busBooking.update({
    where: { id: bookingId },
    data: { status: BOOKING_STATUS.COMPLETED },
  });

  return { booking: updated };
}

export async function checkInTaxiBooking(bookingId: string, operatorId: string) {
  const booking = await prisma.taxiBooking.findUnique({
    where: { id: bookingId },
    include: { departure: { include: { route: true } } },
  });

  if (!booking || booking.departure.route.operatorId !== operatorId) {
    return { error: "Booking not found" as const };
  }
  if (booking.paymentStatus !== "paid") {
    return { error: "Ticket must be paid before check-in" as const };
  }
  if (booking.status === BOOKING_STATUS.CANCELLED) {
    return { error: "Booking cancelled" as const };
  }

  const updated = await prisma.taxiBooking.update({
    where: { id: bookingId },
    data: {
      checkedInAt: new Date(),
      status: "checked_in",
    },
  });

  return { booking: updated };
}

export async function completeTaxiBooking(bookingId: string, operatorId: string) {
  const booking = await prisma.taxiBooking.findUnique({
    where: { id: bookingId },
    include: { departure: { include: { route: true } } },
  });

  if (!booking || booking.departure.route.operatorId !== operatorId) {
    return { error: "Booking not found" as const };
  }
  if (booking.paymentStatus !== "paid") {
    return { error: "Ticket must be paid" as const };
  }

  const updated = await prisma.taxiBooking.update({
    where: { id: bookingId },
    data: { status: BOOKING_STATUS.COMPLETED },
  });

  return { booking: updated };
}

export async function cancelBusSchedule(scheduleId: string, operatorId: string) {
  const schedule = await prisma.busSchedule.findFirst({
    where: { id: scheduleId, route: { operatorId } },
    include: { bookings: true },
  });

  if (!schedule) return { error: "Schedule not found" as const };

  await prisma.$transaction(async (tx) => {
    await tx.busSchedule.update({
      where: { id: scheduleId },
      data: { status: BOOKING_STATUS.CANCELLED },
    });

    for (const booking of schedule.bookings) {
      if (booking.status === BOOKING_STATUS.CANCELLED) continue;
      await tx.busBooking.update({
        where: { id: booking.id },
        data: {
          status: BOOKING_STATUS.CANCELLED,
          cancelledAt: new Date(),
          refundStatus: booking.paymentStatus === "paid" ? "pending" : "none",
        },
      });
    }
  });

  for (const booking of schedule.bookings) {
    if (booking.paymentStatus === "paid" && booking.status !== BOOKING_STATUS.CANCELLED) {
      await processBookingRefund({ referenceType: "bus_booking", referenceId: booking.id });
    }
  }

  return { scheduleId };
}

export async function cancelTaxiDeparture(departureId: string, operatorId: string) {
  const departure = await prisma.taxiDeparture.findFirst({
    where: { id: departureId, route: { operatorId } },
    include: { bookings: true },
  });

  if (!departure) return { error: "Departure not found" as const };

  await prisma.$transaction(async (tx) => {
    await tx.taxiDeparture.update({
      where: { id: departureId },
      data: { status: BOOKING_STATUS.CANCELLED },
    });

    for (const booking of departure.bookings) {
      if (booking.status === BOOKING_STATUS.CANCELLED) continue;
      await tx.taxiBooking.update({
        where: { id: booking.id },
        data: {
          status: BOOKING_STATUS.CANCELLED,
          cancelledAt: new Date(),
          refundStatus: booking.paymentStatus === "paid" ? "pending" : "none",
        },
      });
    }
  });

  for (const booking of departure.bookings) {
    if (booking.paymentStatus === "paid" && booking.status !== BOOKING_STATUS.CANCELLED) {
      await processBookingRefund({ referenceType: "taxi_booking", referenceId: booking.id });
    }
  }

  return { departureId };
}
