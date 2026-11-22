import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Run daily by Vercel Cron (vercel.json): sends every paid Zaroda Sports subscription to the ZARODA POS, so it is
 * posted to ZARODA's own books as Zaroda Sports income. The POS stores each payment once, so sending all of them each
 * day is safe. Needs ZARODA_INCOME_SYNC_KEY (= SPORTS_INCOME_SYNC_KEY on the POS); POS_API_URL defaults to
 * https://api.zarodashop.com. Without the key nothing is sent.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET isn't set" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const key = (process.env.ZARODA_INCOME_SYNC_KEY ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
  if (key.length < 24) return NextResponse.json({ sent: 0, skipped: "ZARODA_INCOME_SYNC_KEY is not set" });

  const paid = await prisma.paymentTransaction.findMany({
    where: { status: "PAID", amountKes: { gt: 0 } },
    select: {
      id: true,
      amountKes: true,
      completedAt: true,
      updatedAt: true,
      mpesaReceipt: true,
      paystackReference: true,
      tenant: { select: { organizationName: true } },
      plan: { select: { displayName: true } },
    },
  });

  const url = `${(process.env.POS_API_URL || "https://api.zarodashop.com").replace(/\/+$/, "")}/sales-sync/income`;
  let added = 0;
  // The POS takes at most 300 receipts (and 100 KB) per request.
  for (let i = 0; i < paid.length; i += 250) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-income-sync-key": key },
      body: JSON.stringify({
        app: "SPORTS",
        receipts: paid.slice(i, i + 250).map((p) => ({
          id: p.id,
          payer: (p.tenant.organizationName || "A championship organiser").slice(0, 200),
          description: `Zaroda Sports subscription (${p.plan.displayName})`.slice(0, 120),
          amountKes: p.amountKes,
          paidAt: (p.completedAt ?? p.updatedAt).toISOString(),
          reference: (p.mpesaReceipt || p.paystackReference).slice(0, 60),
        })),
      }),
    });
    if (!res.ok) return NextResponse.json({ error: `POS answered ${res.status}: ${(await res.text()).slice(0, 300)}` }, { status: 502 });
    added += ((await res.json()) as { added?: number }).added ?? 0;
  }
  return NextResponse.json({ sent: paid.length, added });
}
