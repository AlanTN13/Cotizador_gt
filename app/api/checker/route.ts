import { NextResponse } from "next/server";
import { validateCheckerPayload } from "@/lib/validate";
import { isLimited } from "@/lib/rate-limit";
import { getClientIP } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const ip = getClientIP(req.headers);
    if (isLimited(ip)) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Try again in a minute." },
        { status: 429 }
      );
    }

    const body = await req.json();

    if (typeof body._hp === "string" && body._hp.trim() !== "") {
      return NextResponse.json({ ok: true });
    }

    let payload;
    try {
      payload = validateCheckerPayload(body);
    } catch (e: any) {
      const first = e?.issues?.[0]?.message || "Bad Request";
      return NextResponse.json({ ok: false, error: first }, { status: 400 });
    }

    const webhook = process.env.N8N_CHECKER_WEBHOOK_URL;
    if (!webhook) {
      return NextResponse.json(
        { ok: false, error: "Falta N8N_CHECKER_WEBHOOK_URL" },
        { status: 500 }
      );
    }

    const enriched = {
      ...payload,
      _meta: {
        ts: Date.now(),
        userAgent: req.headers.get("user-agent"),
        referer: req.headers.get("referer"),
        ip,
      },
    };

    const r = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enriched),
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: text || `Webhook error (${r.status})` },
        { status: 502 }
      );
    }

    let data: any = null;
    try {
      data = await r.json();
    } catch {}

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error inesperado" },
      { status: 500 }
    );
  }
}
