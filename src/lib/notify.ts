import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/mnotify";

export interface NotifyRecipient {
  /** Phone is the de-dup key — a phone number is only ever messaged once per call. */
  phone: string;
  smsMessage: string;
  /** Omit to send SMS only (e.g. a party with no Lorgric account). */
  inApp?: {
    userId: string;
    actorId?: string;
    type: string;
    title: string;
    body: string;
    link?: string;
    entityId?: string;
  };
}

/**
 * Sends SMS and in-app notifications to a set of recipients in parallel.
 * Recipients are deduped by phone number (the real-world unique identity for a
 * person here) so the same phone never receives the same update twice even if
 * it shows up under two roles (e.g. a rider who is also the requester).
 */
export async function notifyParties(recipients: NotifyRecipient[]): Promise<void> {
  const seenPhones = new Set<string>();
  const deduped = recipients.filter((r) => {
    if (!r.phone || seenPhones.has(r.phone)) return false;
    seenPhones.add(r.phone);
    return true;
  });

  await Promise.all([
    Promise.allSettled(
      deduped.map((r) => sendSMS({ to: r.phone, message: r.smsMessage }))
    ),
    Promise.allSettled(
      deduped
        .filter((r) => r.inApp)
        .map((r) =>
          prisma.notification.create({
            data: {
              userId: r.inApp!.userId,
              actorId: r.inApp!.actorId,
              type: r.inApp!.type,
              title: r.inApp!.title,
              body: r.inApp!.body,
              link: r.inApp!.link,
              entityId: r.inApp!.entityId,
            },
          })
        )
    ),
  ]);
}
