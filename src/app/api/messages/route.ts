import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { encryptMessage, decryptMessage } from "@/lib/encryption";
import { notifyParties } from "@/lib/notify";

const messageSchema = z.object({
  receiverId: z.string(),
  content: z.string().min(1).max(2000),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const withUserId = searchParams.get("with");

  if (withUserId) {
    const rawMessages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: withUserId },
          { senderId: withUserId, receiverId: session.user.id },
        ],
      },
      include: {
        sender: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    await prisma.message.updateMany({
      where: { senderId: withUserId, receiverId: session.user.id, read: false },
      data: { read: true },
    });

    const messages = rawMessages.map((msg) => ({
      ...msg,
      content: decryptMessage(msg.content),
    }));

    return NextResponse.json({ messages });
  }

  const allMessages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: session.user.id }, { receiverId: session.user.id }],
    },
    include: {
      sender: { select: { id: true, name: true } },
      receiver: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const convMap = new Map<string, { userId: string; name: string; lastMessage: string; lastMessageFromMe: boolean; unread: number }>();
  for (const msg of allMessages) {
    const partner = msg.senderId === session.user.id ? msg.receiver : msg.sender;
    if (!convMap.has(partner.id)) {
      const unread = await prisma.message.count({
        where: { senderId: partner.id, receiverId: session.user.id, read: false },
      });
      const decrypted = decryptMessage(msg.content);
      convMap.set(partner.id, {
        userId: partner.id,
        name: partner.name,
        lastMessage: decrypted.slice(0, 60),
        lastMessageFromMe: msg.senderId === session.user.id,
        unread,
      });
    }
  }

  return NextResponse.json({ conversations: Array.from(convMap.values()) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { receiverId, content } = messageSchema.parse(body);

    const encrypted = encryptMessage(content);

    const [message, receiver] = await Promise.all([
      prisma.message.create({
        data: { senderId: session.user.id, receiverId, content: encrypted },
      }),
      prisma.user.findUnique({
        where: { id: receiverId },
        select: { id: true, role: true, phone: true },
      }),
    ]);

    // Build messages link based on receiver's portal
    const roleLinks: Record<string, string> = {
      FARMER: "/farmer/messages",
      BUYER: "/buyer/messages",
      LOGISTICS: "/logistics/messages",
      // No dedicated messages inbox for storage facility operators yet — send
      // them to their dashboard rather than a route that doesn't exist.
      STORAGE_FACILITY: "/storage/dashboard",
      ADMIN: "/admin/messages",
    };
    const messagesLink = receiver ? (roleLinks[receiver.role] ?? "/farmer/messages") : "/farmer/messages";
    const senderName = session.user.name ?? "Someone";

    // Upsert: replace any existing unread message notification from same sender
    // so rapid messages collapse to one bell entry instead of spamming
    await prisma.notification.deleteMany({
      where: {
        userId: receiverId,
        actorId: session.user.id,
        type: "MESSAGE",
        read: false,
      },
    });

    // Every message triggers a notification, not the message content itself —
    // in-app + SMS, sent in parallel. The SMS never carries the plaintext
    // (messages are end-to-end encrypted), just a nudge to open the app.
    if (receiver) {
      await notifyParties([
        {
          phone: receiver.phone,
          smsMessage: `Lorgric: You have a new message from ${senderName}. Open the app to read it.`,
          inApp: {
            userId: receiver.id,
            actorId: session.user.id,
            type: "MESSAGE",
            title: `New message from ${senderName}`,
            body: content.slice(0, 80),
            link: messagesLink,
          },
        },
      ]);
    }

    return NextResponse.json({ message: { ...message, content } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
