// Initialize Paystack payment for a subscription plan or open-tournament team fee.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { checkRateDB } from '../_shared/dbRateLimit.ts';
import { extractIp } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY');

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server is not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const ip = extractIp(req);
  const dbIp = await checkRateDB(supabaseUrl, serviceKey, `ip:${ip}`, 30, 60);
  if (!dbIp.allowed) return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    if (!paystackKey) {
      return new Response(JSON.stringify({ error: 'Payment provider not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const mode = body?.mode || 'subscription';

    const admin = createClient(supabaseUrl, serviceKey);

    if (mode === 'team_fee') {
      const championshipId = String(body?.championship_id || '').trim();
      const feeId = String(body?.fee_id || '').trim();
      const teamName = String(body?.team_name || '').trim();
      const contactName = String(body?.contact_name || '').trim();
      const contactEmail = String(body?.contact_email || '').trim();
      const contactPhone = String(body?.contact_phone || '').trim();

      if (!championshipId || !feeId || !teamName || !contactName || !contactEmail) {
        return new Response(JSON.stringify({ error: 'championship_id, fee_id, team_name, contact_name and contact_email are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: championship, error: championshipError } = await admin
        .from('championships')
        .select('id, name, school_level')
        .eq('id', championshipId)
        .maybeSingle();
      if (championshipError || !championship || championship.school_level !== 'open') {
        return new Response(JSON.stringify({ error: 'Open tournament not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: fee, error: feeError } = await admin
        .from('championship_fees')
        .select('id, amount_kes, name, championship_id')
        .eq('id', feeId)
        .eq('championship_id', championshipId)
        .maybeSingle();
      if (feeError || !fee) {
        return new Response(JSON.stringify({ error: 'Fee not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const reference = `ZRD-TEAM-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      const amountKobo = fee.amount_kes * 100;

      const { data: team, error: teamError } = await admin.from('tournament_teams').insert({
        championship_id: championshipId,
        name: teamName,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone || null,
      }).select().single();
      if (teamError || !team) {
        return new Response(JSON.stringify({ error: teamError?.message || 'Could not create team record' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: teamPayment, error: paymentError } = await admin.from('team_fee_payments').insert({
        championship_id: championshipId,
        fee_id: fee.id,
        team_id: team.id,
        amount_kes: fee.amount_kes,
        status: 'pending',
        paystack_reference: reference,
        notes: `Public registration for ${championship.name}`,
      }).select().single();
      if (paymentError || !teamPayment) {
        return new Response(JSON.stringify({ error: paymentError?.message || 'Could not create payment record' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const origin = req.headers.get('origin') || Deno.env.get('PUBLIC_SITE_URL') || 'https://zarodasports.live';
      const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: contactEmail,
          amount: amountKobo,
          currency: 'KES',
          reference,
          callback_url: `${origin}/payment-success?reference=${reference}`,
          metadata: {
            type: 'team_fee',
            championship_id: championshipId,
            championship_name: championship.name,
            fee_id: fee.id,
            fee_name: fee.name,
            team_id: team.id,
            team_payment_id: teamPayment.id,
            team_name: team.name,
            contact_name: contactName,
            contact_email: contactEmail,
            contact_phone: contactPhone || null,
          },
        }),
      });

      const paystackData = await paystackRes.json();
      if (!paystackRes.ok || !paystackData.status) {
        await admin.from('team_fee_payments').update({ status: 'failed' }).eq('id', teamPayment.id);
        return new Response(JSON.stringify({ error: paystackData.message || 'Paystack init failed' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        authorization_url: paystackData.data.authorization_url,
        reference,
        type: 'team_fee',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate user
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { plan_id, championship_id, category, account_type } = body;
    if (!plan_id) {
      return new Response(JSON.stringify({ error: 'plan_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // admin client already initialized above

    // Find tenant
    const { data: tenant, error: tErr } = await admin
      .from('tenants').select('*').eq('user_id', user.id).maybeSingle();
    if (tErr || !tenant) {
      return new Response(JSON.stringify({ error: 'Tenant not found. Please complete signup first.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get plan
    const { data: plan, error: pErr } = await admin
      .from('subscription_plans').select('*').eq('id', plan_id).maybeSingle();
    if (pErr || !plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Server-side level/plan validation — never trust the client's price or level.
    // 1) Only active plans can be purchased (deactivated tiers like old Zone are blocked).
    if (plan.is_active !== true) {
      return new Response(JSON.stringify({ error: 'This plan is not available for purchase.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2) Open Tournament product (tier "national") and school levels must not cross over.
    //    An open account may only buy the Open Tournament plan; a school account may not.
    const isOpenPlan = String(plan.tier) === 'national';
    if (account_type === 'open' && !isOpenPlan) {
      return new Response(JSON.stringify({ error: 'Open Tournament accounts must subscribe to the Open Tournament plan.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (account_type === 'school' && isOpenPlan) {
      return new Response(JSON.stringify({ error: 'School accounts cannot subscribe to the Open Tournament plan.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3) If a specific championship is referenced, its level must match the paid plan tier
    //    (national plan ↔ open championship). This stops paying a lower tier to run a higher one.
    if (championship_id) {
      const { data: champ } = await admin
        .from('championships')
        .select('id, level, school_level, tenant_id')
        .eq('id', championship_id)
        .maybeSingle();
      if (champ) {
        if (champ.tenant_id && champ.tenant_id !== tenant.id) {
          return new Response(JSON.stringify({ error: 'You cannot pay for a championship you do not own.' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const champMatches = isOpenPlan
          ? champ.school_level === 'open'
          : String(champ.level) === String(plan.tier);
        if (!champMatches) {
          return new Response(JSON.stringify({ error: 'The selected plan does not match this championship level.' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    const reference = `ZRD-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const amountKobo = plan.price_kes * 100; // Paystack uses kobo (KES * 100)

    // Initialize Paystack transaction
    const origin = req.headers.get('origin') || Deno.env.get('PUBLIC_SITE_URL') || 'https://zarodasports.live';
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: tenant.email,
        amount: amountKobo,
        currency: 'KES',
        reference,
        callback_url: `${origin}/payment-success?reference=${reference}`,
        metadata: {
          tenant_id: tenant.id,
          plan_id: plan.id,
          championship_id: championship_id || null,
          category: category || null,
          user_id: user.id,
        },
      }),
    });

    const paystackData = await paystackRes.json();
    if (!paystackRes.ok || !paystackData.status) {
      return new Response(JSON.stringify({ error: paystackData.message || 'Paystack init failed' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record pending transaction
    await admin.from('payment_transactions').insert({
      tenant_id: tenant.id,
      plan_id: plan.id,
      paystack_reference: reference,
      amount_kes: plan.price_kes,
      status: 'pending',
      paystack_response: paystackData.data,
    });

    return new Response(JSON.stringify({
      authorization_url: paystackData.data.authorization_url,
      reference,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('init-payment error', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
