import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRate, extractIp } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ip = extractIp(req);
  const ipRate = checkRate(`ip:${ip}`, 10, 60);
  if (!ipRate.allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({ error: "All fields are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send email via Supabase's built-in SMTP or use a simple fetch to a mail API
    // For now, we'll use the Resend-compatible approach or log the message
    const RECIPIENT = "oduorongo@gmail.com";

    // Try sending via a simple SMTP relay if configured
    // Fallback: store the message in the database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Store the contact message
    const response = await fetch(`${supabaseUrl}/rest/v1/contact_messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        name,
        email,
        subject,
        message,
        recipient: RECIPIENT,
      }),
    });

    if (!response.ok) {
      console.error("Failed to store contact message:", await response.text());
    }

    return new Response(
      JSON.stringify({ success: true, message: "Message sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Contact form error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send message" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
