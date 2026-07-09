import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/upload";
import { notifyParties } from "@/lib/notify";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Valid Ghana phone number required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["FARMER", "BUYER", "LOGISTICS", "VENDOR", "ADMIN"]),
  region: z.string().min(1, "Region is required"),
  district: z.string().optional(),
  // Ghana Card (stored, not shown to users)
  ghanaCardNumber: z.string().min(8, "Valid Ghana Card number required"),
  ghanaCardName: z.string().min(2, "Name as on Ghana Card is required"),
  residenceLocation: z.string().min(2, "Place of residence is required"),
  // Farmer-specific
  farmName: z.string().optional(),
  farmSize: z.number().optional(),
  farmLocation: z.string().optional(),
  // Buyer-specific
  businessName: z.string().optional(),
  businessType: z.enum(["RETAILER", "RESTAURANT", "PROCESSOR", "EXPORTER", "HOUSEHOLD"]).optional(),
  // Logistics-specific
  companyName: z.string().optional(),
  licensePlate: z.string().optional(),
  // Vendor-specific
  shopName: z.string().optional(),
});

function formValue(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const farmSizeRaw = formValue(formData, "farmSize");

    const data = registerSchema.parse({
      name: formValue(formData, "name"),
      phone: formValue(formData, "phone"),
      password: formValue(formData, "password"),
      role: formValue(formData, "role"),
      region: formValue(formData, "region"),
      district: formValue(formData, "district"),
      ghanaCardNumber: formValue(formData, "ghanaCardNumber"),
      ghanaCardName: formValue(formData, "ghanaCardName"),
      residenceLocation: formValue(formData, "residenceLocation"),
      farmName: formValue(formData, "farmName"),
      farmSize: farmSizeRaw ? Number(farmSizeRaw) : undefined,
      farmLocation: formValue(formData, "farmLocation"),
      businessName: formValue(formData, "businessName"),
      businessType: formValue(formData, "businessType"),
      companyName: formValue(formData, "companyName"),
      licensePlate: formValue(formData, "licensePlate"),
      shopName: formValue(formData, "shopName"),
    });

    const idPhotoFile = formData.get("idPhotoFront");
    if (data.role === "ADMIN" && !(idPhotoFile instanceof File)) {
      return NextResponse.json(
        { error: "A photo of your Ghana Card is required to apply as an admin" },
        { status: 400 }
      );
    }

    // Save (and validate) the photo BEFORE creating any account — an admin
    // application must never leave behind a user with no AdminRequest, since
    // that combination is treated as an already-approved admin.
    let idPhotoFront: string | undefined;
    if (data.role === "ADMIN" && idPhotoFile instanceof File) {
      try {
        idPhotoFront = await saveUploadedFile(idPhotoFile);
      } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 400 });
      }
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ phone: data.phone }] },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Phone number already registered" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        phone: data.phone,
        password: hashedPassword,
        // Admin applicants get full BUYER (customer) access immediately — the
        // account only becomes ADMIN once an existing admin approves the
        // AdminRequest created below.
        role: data.role === "ADMIN" ? "BUYER" : data.role,
        region: data.region,
        district: data.district,
        ghanaCardNumber: data.ghanaCardNumber,
        ghanaCardName: data.ghanaCardName,
        residenceLocation: data.residenceLocation,
        ...(data.role === "FARMER" && {
          farmerProfile: {
            create: {
              farmName: data.farmName ?? `${data.name}'s Farm`,
              farmSize: data.farmSize,
              location: data.farmLocation ?? data.region,
            },
          },
        }),
        ...((data.role === "BUYER" || data.role === "ADMIN") && {
          buyerProfile: {
            create: {
              businessName: data.businessName,
              businessType: data.businessType ?? "HOUSEHOLD",
            },
          },
        }),
        ...(data.role === "LOGISTICS" && {
          logisticsProfile: {
            create: {
              companyName: data.companyName,
              vehicleType: "MOTORBIKE",
              licensePlate: data.licensePlate,
              coverageAreas: [data.region],
            },
          },
        }),
        ...(data.role === "VENDOR" && {
          vendorProfile: {
            create: {
              shopName: data.shopName ?? `${data.name}'s Shop`,
              location: data.region,
              coverageAreas: [data.region],
            },
          },
        }),
        ...(data.role === "ADMIN" &&
          idPhotoFront && {
            adminRequest: {
              create: {
                ghanaCardNumber: data.ghanaCardNumber,
                ghanaCardName: data.ghanaCardName,
                idPhotoFront,
              },
            },
          }),
      },
      select: { id: true, name: true, phone: true, role: true },
    });

    if (data.role === "ADMIN" && idPhotoFront) {
      const existingAdmins = await prisma.user.findMany({
        where: { role: "ADMIN", id: { not: user.id } },
        select: { id: true, phone: true },
      });

      await notifyParties(
        existingAdmins.map((admin) => ({
          phone: admin.phone,
          smsMessage: `Lorgric: ${data.name} has applied for an admin account and is awaiting your review.`,
          inApp: {
            userId: admin.id,
            type: "ADMIN_APPLICATION",
            title: "New admin application",
            body: `${data.name} has applied for an admin account.`,
            link: "/admin/admin-requests",
          },
        }))
      );
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? error.message }, { status: 400 });
    }
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
