import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { VendorProductCategory } from "@prisma/client";

const productSchema = z.object({
  name: z.string().min(1),
  category: z.string(),
  description: z.string().optional(),
  price: z.number().positive(),
  unit: z.string().min(1),
  stock: z.number().int().min(0).default(0),
  images: z.array(z.string()).optional(),
});

async function getVendorProfile(userId: string) {
  return prisma.vendorProfile.findUnique({ where: { userId } });
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getVendorProfile(session.user.id);
  if (!vendor) return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });

  const products = await prisma.vendorProduct.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isVerified) {
    return NextResponse.json(
      { error: "Verify your account before listing products" },
      { status: 403 }
    );
  }

  const vendor = await getVendorProfile(session.user.id);
  if (!vendor) return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });

  try {
    const body = await req.json();
    const data = productSchema.parse(body);

    const product = await prisma.vendorProduct.create({
      data: {
        vendorId: vendor.id,
        name: data.name,
        category: data.category as VendorProductCategory,
        description: data.description,
        price: data.price,
        unit: data.unit,
        stock: data.stock,
        images: data.images ?? [],
      },
    });

    // Notify followers
    const followerIds = await prisma.follow.findMany({
      where: { followingId: session.user.id },
      select: { followerId: true },
    });
    if (followerIds.length > 0) {
      await prisma.notification.createMany({
        data: followerIds.map((f) => ({
          userId: f.followerId,
          actorId: session.user.id,
          type: "NEW_PRODUCT",
          title: `New product from ${session.user.name ?? "a vendor"}`,
          body: `${product.name} — GHS ${product.price}/${product.unit}`,
          link: `/equipment`,
          entityId: product.id,
        })),
      });
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
