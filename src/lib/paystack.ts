const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_BASE = "https://api.paystack.co";

interface InitializePaymentParams {
  email: string;
  amount: number; // in pesewas (GHS * 100)
  reference: string;
  phone?: string;
  provider?: "mtn" | "tigo";
  channels?: string[];
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
}

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

interface InitializeData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

interface VerifyData {
  status: string;
  reference: string;
  amount: number;
  paid_at: string;
  channel: string;
}

async function paystackFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<PaystackResponse<T>> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(`Paystack API error: ${res.status} — ${JSON.stringify(errBody)}`);
  }

  return res.json();
}

export async function initializePayment(params: InitializePaymentParams) {
  const body: Record<string, unknown> = {
    email: params.email,
    amount: Math.round(params.amount * 100), // convert GHS to pesewas
    reference: params.reference,
    currency: "GHS",
    channels: params.channels ?? ["mobile_money"],
    metadata: params.metadata ?? {},
    ...(params.callbackUrl && { callback_url: params.callbackUrl }),
  };

  if (params.phone) {
    body.mobile_money = {
      phone: params.phone,
      provider: params.provider ?? "mtn",
    };
  }

  return paystackFetch<InitializeData>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function verifyPayment(reference: string) {
  return paystackFetch<VerifyData>(`/transaction/verify/${reference}`);
}

export function generatePaymentReference(orderId: string) {
  return `AGRI-${orderId}-${Date.now()}`;
}
