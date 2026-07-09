// mNotify SMS API — Ghana's leading bulk SMS platform
// Docs: https://readthedocs.mnotify.com (Quick SMS)

const MNOTIFY_API_KEY = process.env.MNOTIFY_API_KEY!;
const MNOTIFY_BASE = "https://api.mnotify.com/api/sms/quick";

export interface SMSResult {
  status: string;
  code: string;
  message: string;
}

export async function sendSMS(params: {
  to: string | string[];
  message: string;
  senderId?: string;
}): Promise<SMSResult> {
  const recipient = Array.isArray(params.to) ? params.to : [params.to];

  const url = new URL(MNOTIFY_BASE);
  url.searchParams.set("key", MNOTIFY_API_KEY);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      recipient,
      sender: params.senderId ?? "Lorgric",
      message: params.message,
      is_schedule: false,
      schedule_date: "",
    }),
  });

  if (!res.ok) {
    throw new Error(`mNotify API error: ${res.status}`);
  }

  return res.json();
}

export async function sendOrderConfirmationSMS(params: {
  buyerPhone: string;
  farmerPhone: string;
  cropType: string;
  quantity: number;
  unit: string;
  totalAmount: number;
  orderId: string;
}) {
  const { buyerPhone, farmerPhone, cropType, quantity, unit, totalAmount, orderId } = params;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  await Promise.allSettled([
    sendSMS({
      to: buyerPhone,
      message: `Lorgric: Your order for ${quantity}${unit} of ${cropType} (GHS ${totalAmount}) is confirmed. Order #${orderId.slice(-6).toUpperCase()}. Track: ${appUrl}/tracking/${orderId}`,
    }),
    sendSMS({
      to: farmerPhone,
      message: `Lorgric: New order! ${quantity}${unit} of ${cropType} ordered (GHS ${totalAmount}). Order #${orderId.slice(-6).toUpperCase()}. Check your dashboard to confirm.`,
    }),
  ]);
}

export async function sendRecommendationSMS(params: {
  phone: string;
  buyerName: string;
  message: string;
}) {
  return sendSMS({
    to: params.phone,
    message: `Hi ${params.buyerName}! ${params.message} Reply STOP to opt out.`,
  });
}

