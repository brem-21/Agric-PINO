import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyParties } from "@/lib/notify";

class BookingError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { action, facilityNotes } = body as {
    action?: "CONFIRM" | "REJECT" | "DROP_OFF" | "RETURN" | "CANCEL";
    facilityNotes?: string;
  };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.storageBooking.findUnique({
        where: { id },
        include: { facility: true },
      });
      if (!booking) throw new BookingError("Booking not found", 404);

      const isFacilityOwner = session.user.role === "STORAGE_FACILITY" && booking.facility.userId === session.user.id;
      const isFarmerOwner = booking.farmerId === session.user.id;
      const isAdmin = session.user.role === "ADMIN";

      if (action === "CANCEL") {
        if (!isFarmerOwner && !isAdmin) throw new BookingError("Not authorized", 403);
        if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
          throw new BookingError("Booking can no longer be cancelled", 400);
        }
        return tx.storageBooking.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
      }

      if (!isFacilityOwner && !isAdmin) throw new BookingError("Not authorized", 403);

      if (action === "CONFIRM") {
        if (booking.status !== "PENDING") throw new BookingError("Booking is not pending", 400);
        return tx.storageBooking.update({ where: { id }, data: { status: "CONFIRMED", confirmedAt: new Date() } });
      }

      if (action === "REJECT") {
        if (booking.status !== "PENDING") throw new BookingError("Booking is not pending", 400);
        return tx.storageBooking.update({ where: { id }, data: { status: "REJECTED", facilityNotes } });
      }

      if (action === "DROP_OFF") {
        if (booking.status !== "CONFIRMED") throw new BookingError("Booking must be confirmed first", 400);

        let listingId = booking.listingId;
        if (!listingId) {
          const listing = await tx.produceListing.create({
            data: {
              farmerId: booking.farmerId,
              cropType: booking.cropType,
              category: booking.category,
              quantity: booking.quantity,
              unit: booking.unit,
              pricePerUnit: booking.pricePerUnit,
              location: booking.facility.location,
              latitude: booking.facility.latitude,
              longitude: booking.facility.longitude,
              status: "ACTIVE",
              approvalStatus: "PENDING",
              storageFacilityId: booking.facilityId,
            },
          });
          listingId = listing.id;
        } else {
          await tx.produceListing.update({ where: { id: listingId }, data: { storageFacilityId: booking.facilityId } });
        }

        return tx.storageBooking.update({
          where: { id },
          data: { status: "DROPPED_OFF", droppedOffAt: new Date(), listingId },
        });
      }

      if (action === "RETURN") {
        if (booking.status !== "DROPPED_OFF") throw new BookingError("Booking is not in storage", 400);
        if (booking.listingId) {
          await tx.produceListing.update({ where: { id: booking.listingId }, data: { storageFacilityId: null } });
        }
        return tx.storageBooking.update({ where: { id }, data: { status: "RETURNED_TO_FARMER", returnedAt: new Date() } });
      }

      throw new BookingError("Invalid action", 400);
    });

    const updatedBooking = await prisma.storageBooking.findUniqueOrThrow({
      where: { id },
      include: { farmer: { select: { phone: true } } },
    });
    if (["CONFIRMED", "REJECTED", "DROPPED_OFF", "RETURNED_TO_FARMER"].includes(result.status)) {
      const statusLabel = result.status.replace(/_/g, " ").toLowerCase();
      await notifyParties([
        {
          phone: updatedBooking.farmer.phone,
          smsMessage: `Your storage booking for ${updatedBooking.cropType} is now: ${statusLabel}.`,
          inApp: {
            userId: updatedBooking.farmerId,
            type: "STORAGE_BOOKING_UPDATE",
            title: `Storage booking ${statusLabel}`,
            body: `${updatedBooking.cropType} — ${updatedBooking.quantity} ${updatedBooking.unit}`,
            link: "/farmer/storage/bookings",
            entityId: updatedBooking.id,
          },
        },
      ]);
    }

    return NextResponse.json({ booking: result });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
