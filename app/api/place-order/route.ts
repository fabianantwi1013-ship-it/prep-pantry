import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { BUSINESS_NAME, BUSINESS_WHATSAPP } from "@/lib/config";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

type SendResult = { ok: true } | { ok: false; error: string };

// Sends one SMS via whichever provider is configured through env vars.
// Supports mNotify and Arkesel (both popular in Ghana). Add a key to switch on.
async function sendViaProvider(to: string, message: string): Promise<SendResult> {
  const provider = (process.env.SMS_PROVIDER || "mnotify").toLowerCase();
  const key = process.env.SMS_API_KEY;
  const sender = process.env.SMS_SENDER_ID || "PrepPantry";

  if (!key) return { ok: false, error: "SMS not configured" };

  try {
    if (provider === "arkesel") {
      const r = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
        method: "POST",
        headers: { "api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ sender, message, recipients: [to] }),
      });
      if (!r.ok) return { ok: false, error: `Arkesel error ${r.status}` };
      return { ok: true };
    }
    // default: mNotify
    const r = await fetch(
      "https://api.mnotify.com/api/sms/quick?key=" + encodeURIComponent(key),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: [to], sender, message }),
      }
    );
    if (!r.ok) return { ok: false, error: `mNotify error ${r.status}` };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "SMS provider unreachable",
    };
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Bad request." },
      { status: 400 }
    );
  }

  const name = String(body.name ?? "").trim().slice(0, 120);
  const phone = String(body.phone ?? "").trim().slice(0, 30);
  const address = String(body.address ?? "").trim().slice(0, 300);
  const note = String(body.note ?? "").trim().slice(0, 300);
  const items = Array.isArray(body.items) ? body.items.slice(0, 100) : [];

  if (!name || !phone || !address || items.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Fill in your name, phone and address first." },
      { status: 400 }
    );
  }

  // Anonymous client — the pp_place_order RPC looks prices up server-side,
  // so nothing the customer sends can change what they're charged.
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("pp_place_order", {
    p_name: name,
    p_phone: phone,
    p_address: address,
    p_note: note,
    p_items: items,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Could not place the order." },
      { status: 400 }
    );
  }

  const order = data as { id: string; code: string; total: number; items: number };

  // Best-effort SMS alert to the shop owner — the dashboard always shows the
  // order either way, so a failed text must never fail the order.
  const ownerPhone = process.env.OWNER_ALERT_PHONE || BUSINESS_WHATSAPP;
  if (ownerPhone) {
    const alert =
      `${BUSINESS_NAME}: NEW ORDER ${order.code} — ` +
      `${name} (${phone}), ${order.items} item(s), GHS${Number(order.total)}. ` +
      `Deliver to: ${address}.` +
      (note ? ` Note: ${note}.` : "") +
      ` See the dashboard for details.`;
    await sendViaProvider(ownerPhone, alert.slice(0, 600));
  }

  return NextResponse.json({ ok: true, code: order.code, total: order.total });
}
