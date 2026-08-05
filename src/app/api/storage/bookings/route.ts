import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyParties } from "@/lib/notify";

const bookingSchema = z.object({
  facilityId: z.string(),
  cropType: z.string().min(1),
  category: z.enum(["VEGETABLES", "GRAINS", "TUBERS", "FRUITS", "LEGUMES", "LIVESTOCK"]),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  pricePerUnit: z.number().positive(),
  scheduledDropoff: z.string(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role === "STORAGE_FACILITY") {
    const facility = await prisma.storageFacilityProfile.findUnique({ where: { userId: session.user.id } });
    if (!facility) return NextResponse.json({ bookings: [] });

    const bookings = await prisma.storageBooking.findMany({
      where: { facilityId: facility.id },
      include: { farmer: { select: { id: true, name: true, phone: true } } },
      orderBy: { scheduledDropoff: "asc" },
    });
    return NextResponse.json({ bookings });
  }

  const bookings = await prisma.storageBooking.findMany({
    where: { farmerId: session.user.id },
    include: { facility: { select: { id: true, name: true, location: true } } },
    orderBy: { scheduledDropoff: "desc" },
  });
  return NextResponse.json({ bookings });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "FARMER") {
    return NextResponse.json({ error: "Only farmers can book a drop-off" }, { status: 401 });
  }

  try {
    const data = bookingSchema.parse(await req.json());

    const facility = await prisma.storageFacilityProfile.findUnique({ where: { id: data.facilityId } });
    if (!facility || facility.approvalStatus !== "APPROVED") {
      return NextResponse.json({ error: "Facility not available" }, { status: 400 });
    }

    const booking = await prisma.storageBooking.create({
      data: { ...data, scheduledDropoff: new Date(data.scheduledDropoff), farmerId: session.user.id },
    });

    const facilityOwner = await prisma.user.findUnique({ where: { id: facility.userId }, select: { phone: true, id: true } });
    if (facilityOwner) {
      await notifyParties([
        {
          phone: facilityOwner.phone,
          smsMessage: `New storage booking: ${data.quantity}${data.unit} of ${data.cropType} from ${session.user.name}, drop-off requested ${new Date(data.scheduledDropoff).toLocaleDateString()}.`,
          inApp: {
            userId: facilityOwner.id,
            actorId: session.user.id,
            type: "NEW_STORAGE_BOOKING",
            title: `New drop-off request from ${session.user.name}`,
            body: `${data.quantity} ${data.unit} of ${data.cropType}`,
            link: "/storage/bookings",
            entityId: booking.id,
          },
        },
      ]);
    }

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
