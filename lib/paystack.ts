// Server-only Paystack client. PAYSTACK_SECRET_KEY must never be imported into
// a client component - this module is only safe to import from Route Handlers,
// Server Actions, and other server-only lib code.

import { createHmac, timingSafeEqual } from "crypto";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return key;
}

export type PaystackMode = "subscription" | "team_fee";

export interface PaystackMetadata {
  mode: PaystackMode;
  tenantId?: string;
  planId?: string;
  teamId?: string;
  feeId?: string;
  championshipId?: string;
  [key: string]: unknown;
}

export interface PaystackInitializeParams {
  email: string;
  amountKobo: number;
  reference: string;
  metadata: PaystackMetadata;
  callbackUrl: string;
}

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export async function initializePaystackTransaction(
  params: PaystackInitializeParams,
): Promise<PaystackInitializeResponse> {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      metadata: params.metadata,
      callback_url: params.callbackUrl,
    }),
  });

  const json = (await response.json()) as PaystackInitializeResponse;
  if (!response.ok || !json.status) {
    throw new Error(json.message || "Failed to initialize Paystack transaction");
  }
  return json;
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: "success" | "failed" | "abandoned";
    reference: string;
    amount: number;
    currency: string;
    metadata: PaystackMetadata;
    gateway_response: string;
    paid_at: string | null;
  };
}

export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResponse> {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${getSecretKey()}` },
    cache: "no-store",
  });

  const json = (await response.json()) as PaystackVerifyResponse;
  if (!response.ok) {
    throw new Error(json.message || "Failed to verify Paystack transaction");
  }
  return json;
}

/** Spec-mandated conversion: Paystack amount field is KES x 100. */
export function kesToKobo(amountKes: number): number {
  return Math.round(amountKes * 100);
}

export function generatePaymentReference(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Paystack signs webhook bodies with HMAC-SHA512 over the raw (unparsed)
 * request bytes, keyed with the secret key. Must be called with the exact
 * raw body text - re-serializing a parsed JSON object can reorder keys or
 * change whitespace and break the comparison.
 */
export function verifyPaystackWebhookSignature(rawBody: string, signature: string | null | undefined): boolean {
  if (!signature) return false;

  let secretKey: string;
  try {
    secretKey = getSecretKey();
  } catch {
    return false;
  }

  const expected = createHmac("sha512", secretKey).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}

/** Essential-tier subscriptions run for 12 months from payment. */
export function computeSubscriptionExpiry(from: Date = new Date()): Date {
  const expires = new Date(from);
  expires.setFullYear(expires.getFullYear() + 1);
  return expires;
}
