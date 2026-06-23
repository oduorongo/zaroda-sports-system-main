// Verify Paystack payment and activate subscription or team fee.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { checkRateDB } from '../_shared/dbRateLimit.ts';
import { extractIp } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const ip = extractIp(req);
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server is not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const dbIp = await checkRateDB(supabaseUrl, serviceKey, `ip:${ip}`, 60, 60);
  if (!dbIp.allowed) return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const url = new URL(req.url);
    const reference = url.searchParams.get('reference') ||
      (req.method === 'POST' ? (await req.json()).reference : null);

    if (!reference) {
      return new Response(JSON.stringify({ error: 'reference required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackKey) {
      return new Response(JSON.stringify({ error: 'Payment provider not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${paystackKey}` },
    });
    const verifyData = await verifyRes.json();

    const admin = createClient(supabaseUrl, serviceKey);

    if (!verifyRes.ok || !verifyData.status || verifyData.data?.status !== 'success') {
      await admin.from('payment_transactions')
        .update({ status: 'failed', paystack_response: verifyData })
        .eq('paystack_reference', reference);
      return new Response(JSON.stringify({ success: false, message: 'Payment not successful' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const meta = verifyData.data.metadata || {};
    const championshipId = meta.championship_id || null;
    const category = meta.category || null;

    if (meta.type === 'team_fee') {
      const teamPaymentId = meta.team_payment_id || null;
      const teamId = meta.team_id || null;
      const feeId = meta.fee_id || null;

      if (!teamPaymentId || !teamId || !feeId || !championshipId) {
        return new Response(JSON.stringify({ error: 'Team payment metadata missing' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: existingTeamPayment } = await admin
        .from('team_fee_payments')
        .select('id, status')
        .eq('id', teamPaymentId)
        .maybeSingle();

      if (existingTeamPayment?.status === 'paid') {
        return new Response(JSON.stringify({ success: true, already_processed: true, type: 'team_fee' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await admin.from('team_fee_payments').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        paystack_reference: reference,
      }).eq('id', teamPaymentId);

      return new Response(JSON.stringify({
        success: true,
        type: 'team_fee',
        team_id: teamId,
        fee_id: feeId,
        championship_id: championshipId,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up the pending tx for subscription payments.
    const { data: tx } = await admin
      .from('payment_transactions').select('*').eq('paystack_reference', reference).maybeSingle();
    if (!tx) {
      return new Response(JSON.stringify({ error: 'Transaction not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (tx.status === 'success') {
      return new Response(JSON.stringify({ success: true, already_processed: true, type: 'subscription' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Activate subscription (1 year validity from now)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const { data: sub, error: subErr } = await admin.from('championship_subscriptions').insert({
      tenant_id: tx.tenant_id,
      championship_id: championshipId,
      plan_id: tx.plan_id,
      status: 'active',
      paid_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      amount_paid_kes: tx.amount_kes,
      category,
    }).select().single();

    if (subErr) console.error('sub insert err', subErr);

    await admin.from('payment_transactions').update({
      status: 'success',
      subscription_id: sub?.id,
      paystack_response: verifyData.data,
    }).eq('paystack_reference', reference);

    return new Response(JSON.stringify({ success: true, type: 'subscription', subscription: sub }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('verify-payment error', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
