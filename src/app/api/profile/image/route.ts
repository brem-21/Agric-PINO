import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = z.object({ imageUrl: z.string().url().or(z.string().startsWith("/")) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: parsed.data.imageUrl },
  });

  return NextResponse.json({ ok: true, imageUrl: parsed.data.imageUrl });
}
