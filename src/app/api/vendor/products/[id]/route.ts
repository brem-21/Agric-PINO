import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  unit: z.string().min(1).optional(),
  stock: z.number().int().min(0).optional(),
  isAvailable: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: session.user.id } });
  if (!vendor) return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });

  const product = await prisma.vendorProduct.findUnique({ where: { id } });
  if (!product || product.vendorId !== vendor.id) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);

    const updated = await prisma.vendorProduct.update({ where: { id }, data });
    return NextResponse.json({ product: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: session.user.id } });
  if (!vendor) return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });

  const product = await prisma.vendorProduct.findUnique({ where: { id } });
  if (!product || product.vendorId !== vendor.id) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  await prisma.vendorProduct.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
