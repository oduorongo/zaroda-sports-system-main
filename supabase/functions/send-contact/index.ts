// Handle contact form submissions and store them in the database.
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

const RESPONSE_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'application/json' };
const RECIPIENT_EMAIL = 'oduorongo@gmail.com';
const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60;

// ============================================================================
// HELPERS
// ============================================================================

function errorResponse(message: string, status: number = 400): Response {
  console.error(`[Contact Form Error] Status ${status}: ${message}`);
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

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  // Validate environment
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceKey) {
    return errorResponse('Server is not configured', 500);
  }

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

  // Parse body
  let body: { name?: string; email?: string; subject?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON in request body', 400);
  }

  const { name, email, subject, message } = body;

  // Validate required fields
  if (!name || !email || !subject || !message) {
    return errorResponse('All fields (name, email, subject, message) are required', 400);
  }

  // Validate email format
  const trimmedEmail = String(email).trim();
  if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
    return errorResponse('Invalid email format', 400);
  }

  // Store in database using the Supabase client (consistent with rest of codebase)
  const admin = createClient(supabaseUrl, serviceKey);

  const { error: insertError } = await admin.from('contact_messages').insert({
    name: String(name).trim(),
    email: trimmedEmail,
    subject: String(subject).trim(),
    message: String(message).trim(),
    recipient: RECIPIENT_EMAIL,
  });

  if (insertError) {
    console.error('[Contact Form DB Error]', insertError);
    return errorResponse('Failed to save your message. Please try again.', 500);
  }

  console.log(`[Contact Form] Message from ${trimmedEmail} saved successfully`);

  return successResponse({ success: true, message: 'Message sent successfully' });
});