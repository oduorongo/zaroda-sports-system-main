// Verify Paystack payment and activate subscription or team fee.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { checkRateDB } from '../_shared/dbRateLimit.ts';
import { extractIp } from '../_shared/rateLimit.ts';

// ============================================================================
// CONSTANTS
// ============================================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const RESPONSE_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'application/json' };
const PAYSTACK_VERIFY_URL = 'https://api.paystack.co/transaction/verify';
const RATE_LIMIT_REQUESTS = 60;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const SUBSCRIPTION_YEARS = 1;

// ============================================================================
// TYPES
// ============================================================================

interface TeamFeeMetadata {
  type: 'team_fee';
  team_payment_id: string;
  team_id: string;
  fee_id: string;
  championship_id: string;
  [key: string]: string | number | null | boolean;
}

interface SubscriptionMetadata {
  championship_id?: string | null;
  category?: string | null;
  [key: string]: string | number | null | boolean | undefined;
}

// ============================================================================
// HELPERS
// ============================================================================

function errorResponse(message: string, status: number = 400): Response {
  console.error(`[Verify Payment Error] Status ${status}: ${message}`);
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: RESPONSE_HEADERS,
  });
}

function successResponse(data: Record<string, unknown>): Response {
  return new Response(JSON.stringify(data), {
    headers: RESPONSE_HEADERS,
  });
}

function validateEnvironment(): { valid: false; error: string; status: number } | { valid: true; supabaseUrl: string; serviceKey: string; paystackKey: string } {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY');

  if (!supabaseUrl || !serviceKey) {
    return { valid: false, error: 'Server is not configured', status: 500 };
  }
  if (!paystackKey) {
    return { valid: false, error: 'Payment provider not configured', status: 500 };
  }

  return { valid: true, supabaseUrl, serviceKey, paystackKey };
}

async function getReference(req: Request): Promise<string | null> {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get('reference');
  if (fromQuery) return fromQuery;

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      return body?.reference ?? null;
    } catch {
      return null;
    }
  }

  return null;
}

async function verifyWithPaystack(
  reference: string,
  paystackKey: string,
): Promise<{ ok: boolean; data: any }> {
  try {
    const res = await fetch(`${PAYSTACK_VERIFY_URL}/${reference}`, {
      headers: { Authorization: `Bearer ${paystackKey}` },
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (error) {
    console.error('[Paystack Verify Exception]', error);
    return { ok: false, data: null };
  }
}

function getExpiryDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + SUBSCRIPTION_YEARS);
  return date.toISOString();
}

// ============================================================================
// PAYMENT HANDLERS
// ============================================================================

async function handleTeamFeeVerification(
  meta: TeamFeeMetadata,
  reference: string,
  admin: any,
): Promise<Response> {
  const { team_payment_id, team_id, fee_id, championship_id } = meta;

  if (!team_payment_id || !team_id || !fee_id || !championship_id) {
    return errorResponse('Team payment metadata incomplete', 400);
  }

  // Idempotency check
  const { data: existing } = await admin
    .from('team_fee_payments')
    .select('id, status')
    .eq('id', team_payment_id)
    .maybeSingle();

  if (existing?.status === 'paid') {
    console.log(`[Team Fee] Already processed: ${team_payment_id}`);
    return successResponse({ success: true, already_processed: true, type: 'team_fee' });
  }

  const { error: updateError } = await admin
    .from('team_fee_payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paystack_reference: reference,
    })
    .eq('id', team_payment_id);

  if (updateError) {
    console.error('[Team Fee Update Error]', updateError);
    return errorResponse('Failed to activate team fee payment', 500);
  }

  console.log(`[Team Fee] Payment activated: ${team_payment_id}`);

  return successResponse({
    success: true,
    type: 'team_fee',
    team_id,
    fee_id,
    championship_id,
  });
}

async function handleSubscriptionVerification(
  reference: string,
  meta: SubscriptionMetadata,
  verifyData: any,
  admin: any,
): Promise<Response> {
  const championshipId = meta.championship_id ?? null;
  const category = meta.category ?? null;

  // Look up the pending transaction
  const { data: tx, error: txError } = await admin
    .from('payment_transactions')
    .select('*')
    .eq('paystack_reference', reference)
    .maybeSingle();

  if (txError || !tx) {
    console.error('[Transaction Lookup Error]', txError);
    return errorResponse('Transaction not found', 404);
  }

  // Idempotency check
  if (tx.status === 'success') {
    console.log(`[Subscription] Already processed: ${reference}`);
    return successResponse({ success: true, already_processed: true, type: 'subscription' });
  }

  // Insert subscription record
  const { data: sub, error: subError } = await admin
    .from('championship_subscriptions')
    .insert({
      tenant_id: tx.tenant_id,
      championship_id: championshipId,
      plan_id: tx.plan_id,
      status: 'active',
      paid_at: new Date().toISOString(),
      expires_at: getExpiryDate(),
      amount_paid_kes: tx.amount_kes,
      category,
    })
    .select()
    .single();

  if (subError) {
    console.error('[Subscription Insert Error]', subError);
    // Still mark transaction as success since Paystack confirmed payment
  }

  // Update transaction status
  const { error: txUpdateError } = await admin
    .from('payment_transactions')
    .update({
      status: 'success',
      subscription_id: sub?.id ?? null,
      paystack_response: verifyData.data,
    })
    .eq('paystack_reference', reference);

  if (txUpdateError) {
    console.error('[Transaction Update Error]', txUpdateError);
  }

  console.log(`[Subscription] Activated: ${reference}, Plan: ${tx.plan_id}`);

  return successResponse({ success: true, type: 'subscription', subscription: sub });
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: CORS_HEADERS });
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    // Validate environment
    const env = validateEnvironment();
    if (!env.valid) {
      return errorResponse(env.error, env.status);
    }

    const { supabaseUrl, serviceKey, paystackKey } = env;

    // Rate limiting
    const ip = extractIp(req);
    const rateLimit = await checkRateDB(
      supabaseUrl,
      serviceKey,
      `ip:${ip}`,
      RATE_LIMIT_REQUESTS,
      RATE_LIMIT_WINDOW_SECONDS,
    );

    if (!rateLimit.allowed) {
      return errorResponse('Too many requests. Please try again later.', 429);
    }

    // Extract reference
    const reference = await getReference(req);
    if (!reference) {
      return errorResponse('Payment reference is required', 400);
    }

    // Verify with Paystack
    const { ok, data: verifyData } = await verifyWithPaystack(reference, paystackKey);
    const admin = createClient(supabaseUrl, serviceKey);

    // Handle failed verification
    if (!ok || !verifyData?.status || verifyData.data?.status !== 'success') {
      console.error('[Paystack Verification Failed]', verifyData);
      await admin
        .from('payment_transactions')
        .update({ status: 'failed', paystack_response: verifyData })
        .eq('paystack_reference', reference);

      return successResponse({ success: false, message: 'Payment not successful' });
    }

    const meta = verifyData.data?.metadata ?? {};

    // Route to correct handler
    if (meta.type === 'team_fee') {
      return await handleTeamFeeVerification(meta as TeamFeeMetadata, reference, admin);
    }

    return await handleSubscriptionVerification(reference, meta, verifyData, admin);
  } catch (error) {
    console.error('[Unhandled Exception]', error);
    return errorResponse('Internal server error', 500);
  }
});