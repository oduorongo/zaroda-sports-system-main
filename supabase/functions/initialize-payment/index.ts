// Initialize Paystack payment for subscription or open-tournament team fees
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { checkRateDB } from '../_shared/dbRateLimit.ts';
import { extractIp } from '../_shared/rateLimit.ts';

// ============================================================================
// CONSTANTS
// ============================================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PAYSTACK_API = 'https://api.paystack.co/transaction/initialize';
const RESPONSE_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'application/json' };
const PAYSTACK_KOBO_MULTIPLIER = 100;
const DEFAULT_SITE_URL = 'https://zarodasports.live';
const RATE_LIMIT_REQUESTS = 30;
const RATE_LIMIT_WINDOW_SECONDS = 60;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface PaystackMetadata {
  [key: string]: string | number | null | boolean;
}

interface PaystackInitRequest {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callback_url: string;
  metadata: PaystackMetadata;
}

interface ValidationError {
  valid: false;
  error: string;
  status: number;
}

interface ValidationSuccess {
  valid: true;
}

type ValidationResult = ValidationError | ValidationSuccess;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function errorResponse(message: string, status: number = 400): Response {
  console.error(`[Payment Error] Status ${status}: ${message}`);
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: RESPONSE_HEADERS,
  });
}

function successResponse(data: Record<string, any>): Response {
  return new Response(JSON.stringify(data), {
    headers: RESPONSE_HEADERS,
  });
}

function generateReference(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function kesToKobo(kes: number): number {
  return Math.round(kes * PAYSTACK_KOBO_MULTIPLIER);
}

function getOriginUrl(req: Request): string {
  return req.headers.get('origin') || Deno.env.get('PUBLIC_SITE_URL') || DEFAULT_SITE_URL;
}

function validateEnvironment(): ValidationResult {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY');

  if (!supabaseUrl || !serviceKey) {
    return { valid: false, error: 'Server is not configured', status: 500 };
  }

  if (!paystackKey) {
    return { valid: false, error: 'Payment provider not configured', status: 500 };
  }

  return { valid: true };
}

async function initializePaystack(
  request: PaystackInitRequest,
  paystackKey: string,
): Promise<{ status: boolean; data?: any; message?: string }> {
  try {
    const response = await fetch(PAYSTACK_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error('[Paystack Error]', data);
      return { status: false, message: data.message || 'Paystack initialization failed' };
    }

    return { status: true, data: data.data };
  } catch (error) {
    console.error('[Paystack Exception]', error);
    return { status: false, message: `Paystack error: ${String(error)}` };
  }
}

function validateTeamFeeInput(body: any): ValidationResult {
  const required = {
    championship_id: 'championship_id',
    fee_id: 'fee_id',
    team_name: 'team_name',
    contact_name: 'contact_name',
    contact_email: 'contact_email',
  };

  for (const [key, field] of Object.entries(required)) {
    if (!String(body?.[key] || '').trim()) {
      return {
        valid: false,
        error: `${field} is required and cannot be empty`,
        status: 400,
      };
    }
  }

  const email = String(body.contact_email || '').trim();
  if (!email.includes('@') || !email.includes('.')) {
    return {
      valid: false,
      error: 'Invalid contact_email format',
      status: 400,
    };
  }

  return { valid: true };
}

function validateSubscriptionInput(body: any): ValidationResult {
  if (!body?.plan_id) {
    return { valid: false, error: 'plan_id is required', status: 400 };
  }

  return { valid: true };
}

function validatePlanEligibility(
  isOpenPlan: boolean,
  accountType: string,
): ValidationResult {
  if (accountType === 'open' && !isOpenPlan) {
    return {
      valid: false,
      error: 'Open Tournament accounts must subscribe to the Open Tournament plan',
      status: 403,
    };
  }

  if (accountType === 'school' && isOpenPlan) {
    return {
      valid: false,
      error: 'School accounts cannot subscribe to the Open Tournament plan',
      status: 403,
    };
  }

  return { valid: true };
}

// ============================================================================
// PAYMENT HANDLERS
// ============================================================================

async function handleTeamFeePayment(
  body: any,
  admin: any,
  paystackKey: string,
  origin: string,
): Promise<Response> {
  const validation = validateTeamFeeInput(body);
  if (!validation.valid) {
    return errorResponse(validation.error, validation.status);
  }

  const { championship_id, fee_id, team_name, contact_name, contact_email, contact_phone } = {
    championship_id: String(body.championship_id).trim(),
    fee_id: String(body.fee_id).trim(),
    team_name: String(body.team_name).trim(),
    contact_name: String(body.contact_name).trim(),
    contact_email: String(body.contact_email).trim(),
    contact_phone: String(body.contact_phone || '').trim() || null,
  };

  const { data: championship, error: champError } = await admin
    .from('championships')
    .select('id, name, school_level')
    .eq('id', championship_id)
    .maybeSingle();

  if (champError || !championship || championship.school_level !== 'open') {
    console.error('[Championship Lookup Error]', champError);
    return errorResponse('Open tournament not found', 404);
  }

  const { data: fee, error: feeError } = await admin
    .from('championship_fees')
    .select('id, amount_kes, name, championship_id')
    .eq('id', fee_id)
    .eq('championship_id', championship_id)
    .maybeSingle();

  if (feeError || !fee) {
    console.error('[Fee Lookup Error]', feeError);
    return errorResponse('Fee not found', 404);
  }

  const { data: team, error: teamError } = await admin
    .from('tournament_teams')
    .insert({
      championship_id,
      name: team_name,
      contact_name,
      contact_email,
      contact_phone,
    })
    .select()
    .single();

  if (teamError || !team) {
    console.error('[Team Creation Error]', teamError);
    return errorResponse(teamError?.message || 'Could not create team record', 500);
  }

  const { data: teamPayment, error: paymentError } = await admin
    .from('team_fee_payments')
    .insert({
      championship_id,
      fee_id: fee.id,
      team_id: team.id,
      amount_kes: fee.amount_kes,
      status: 'pending',
      paystack_reference: generateReference('ZRD-TEAM'),
      notes: `Public registration for ${championship.name}`,
    })
    .select()
    .single();

  if (paymentError || !teamPayment) {
    console.error('[Payment Record Error]', paymentError);
    return errorResponse(paymentError?.message || 'Could not create payment record', 500);
  }

  const paystackRequest: PaystackInitRequest = {
    email: contact_email,
    amount: kesToKobo(fee.amount_kes),
    currency: 'KES',
    reference: teamPayment.paystack_reference,
    callback_url: `${origin}/payment-success?reference=${teamPayment.paystack_reference}`,
    metadata: {
      type: 'team_fee',
      championship_id,
      championship_name: championship.name,
      fee_id: fee.id,
      fee_name: fee.name,
      team_id: team.id,
      team_payment_id: teamPayment.id,
      team_name,
      contact_name,
      contact_email,
      contact_phone,
    },
  };

  const paystackResult = await initializePaystack(paystackRequest, paystackKey);

  if (!paystackResult.status) {
    await admin.from('team_fee_payments').update({ status: 'failed' }).eq('id', teamPayment.id);
    return errorResponse(paystackResult.message || 'Paystack initialization failed', 502);
  }

  console.log(`[Team Fee Payment] Created: ${teamPayment.id}, Reference: ${teamPayment.paystack_reference}`);

  return successResponse({
    authorization_url: paystackResult.data.authorization_url,
    reference: teamPayment.paystack_reference,
    type: 'team_fee',
  });
}

async function handleSubscriptionPayment(
  body: any,
  admin: any,
  user: any,
  paystackKey: string,
  origin: string,
): Promise<Response> {
  const validation = validateSubscriptionInput(body);
  if (!validation.valid) {
    return errorResponse(validation.error, validation.status);
  }

  const { plan_id, championship_id, category, account_type } = body;

  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (tenantError || !tenant) {
    console.error('[Tenant Lookup Error]', tenantError);
    return errorResponse('Tenant not found. Please complete signup first.', 404);
  }

  const { data: plan, error: planError } = await admin
    .from('subscription_plans')
    .select('*')
    .eq('id', plan_id)
    .maybeSingle();

  if (planError || !plan) {
    console.error('[Plan Lookup Error]', planError);
    return errorResponse('Plan not found', 404);
  }

  if (plan.is_active !== true) {
    return errorResponse('This plan is not available for purchase', 403);
  }

  const isOpenPlan = String(plan.tier) === 'national';
  const eligibility = validatePlanEligibility(isOpenPlan, account_type);
  if (!eligibility.valid) {
    return errorResponse(eligibility.error, eligibility.status);
  }

  if (championship_id) {
    const { data: champ } = await admin
      .from('championships')
      .select('id, level, school_level, tenant_id')
      .eq('id', championship_id)
      .maybeSingle();

    if (champ) {
      if (champ.tenant_id && champ.tenant_id !== tenant.id) {
        return errorResponse('You cannot pay for a championship you do not own', 403);
      }

      const levelMatch = isOpenPlan
        ? champ.school_level === 'open'
        : String(champ.level) === String(plan.tier);

      if (!levelMatch) {
        return errorResponse('The selected plan does not match this championship level', 403);
      }
    }
  }

  const reference = generateReference('ZRD');
  const paystackRequest: PaystackInitRequest = {
    email: tenant.email,
    amount: kesToKobo(plan.price_kes),
    currency: 'KES',
    reference,
    callback_url: `${origin}/payment-success?reference=${reference}`,
    metadata: {
      tenant_id: tenant.id,
      plan_id,
      championship_id: championship_id || null,
      category: category || null,
      user_id: user.id,
    },
  };

  const paystackResult = await initializePaystack(paystackRequest, paystackKey);

  if (!paystackResult.status) {
    return errorResponse(paystackResult.message || 'Paystack initialization failed', 502);
  }

  const { error: recordError } = await admin.from('payment_transactions').insert({
    tenant_id: tenant.id,
    plan_id,
    paystack_reference: reference,
    amount_kes: plan.price_kes,
    status: 'pending',
    paystack_response: paystackResult.data,
  });

  if (recordError) {
    console.error('[Transaction Record Error]', recordError);
    // Don't fail — Paystack init already succeeded
  }

  console.log(`[Subscription Payment] Created: Reference ${reference}, Plan: ${plan_id}`);

  return successResponse({
    authorization_url: paystackResult.data.authorization_url,
    reference,
  });
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: CORS_HEADERS });
    }

    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    const envValidation = validateEnvironment();
    if (!envValidation.valid) {
      return errorResponse(envValidation.error, envValidation.status);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!anonKey) {
      return errorResponse('Server is not configured', 500);
    }

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

    let body: any;
    try {
      body = await req.json();
    } catch {
      return errorResponse('Invalid JSON in request body', 400);
    }

    const mode = body?.mode || 'subscription';
    const admin = createClient(supabaseUrl, serviceKey);
    const origin = getOriginUrl(req);

    if (mode === 'team_fee') {
      return await handleTeamFeePayment(body, admin, paystackKey, origin);
    }

    // Subscription mode — requires auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      console.error('[Auth Error]', userError);
      return errorResponse('Unauthorized', 401);
    }

    return await handleSubscriptionPayment(body, admin, user, paystackKey, origin);
  } catch (error) {
    console.error('[Unhandled Exception]', error);
    return errorResponse('Internal server error', 500);
  }
});