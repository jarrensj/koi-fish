// src/server/controllers/referrals.earnings.controller.ts
/**
 * Read endpoints for referral earnings:
 * - GET /api/referrals/my-earnings/summary
 * - GET /api/referrals/my-earnings/line-items
 *
 * TEMP AUTH: user id from header "X-User-Id".
 */
import type { Request, Response } from "express";
import { getSupabase } from "../../lib/supabase.ts";

function userIdFrom(req: Request) {
  return (req.header("x-user-id") || "").trim() || null;
}

/** GET /api/referrals/my-earnings/summary */
export async function getMyEarningsSummary(req: Request, res: Response) {
  const me = userIdFrom(req);
  if (!me) return res.status(401).json({ error: "missing X-User-Id" });

  const sb = getSupabase();

  // totals (grouped by token) — accrued
  const { data: accRows, error: accErr } = await sb
    .from("referral_earning")
    .select("token_address, amount_atomic")
    .eq("referrer_user_id", me)
    .eq("status", "accrued");

  if (accErr) return res.status(500).json({ error: accErr.message });

  const accrued = Object.values(
    (accRows || []).reduce<Record<string, bigint>>((map, r: any) => {
      const k = r.token_address;
      map[k] = (map[k] ?? 0n) + BigInt(r.amount_atomic);
      return map;
    }, {})
  ).length
    ? Object.entries(
        (accRows || []).reduce<Record<string, bigint>>((map, r: any) => {
          const k = r.token_address;
          map[k] = (map[k] ?? 0n) + BigInt(r.amount_atomic);
          return map;
        }, {})
      ).map(([token, amt]) => ({ token, amountAtomic: amt.toString() }))
    : [];

  // totals (grouped by token) — paid
  const { data: paidRows, error: paidErr } = await sb
    .from("referral_earning")
    .select("token_address, amount_atomic")
    .eq("referrer_user_id", me)
    .eq("status", "paid");

  if (paidErr) return res.status(500).json({ error: paidErr.message });

  const paid = Object.entries(
    (paidRows || []).reduce<Record<string, bigint>>((map, r: any) => {
      const k = r.token_address;
      map[k] = (map[k] ?? 0n) + BigInt(r.amount_atomic);
      return map;
    }, {})
  ).map(([token, amt]) => ({ token, amountAtomic: amt.toString() }));

  // recent 10 accruals
  const { data: recent, error: recErr } = await sb
    .from("referral_earning")
    .select("id, swap_event_id, invitee_user_id, token_address, amount_atomic, status, created_at")
    .eq("referrer_user_id", me)
    .order("created_at", { ascending: false })
    .limit(10);

  if (recErr) return res.status(500).json({ error: recErr.message });

  return res.json({
    totals: { accrued, paid },
    recent: (recent || []).map((r: any) => ({
      id: r.id,
      swapId: r.swap_event_id,
      invitee: r.invitee_user_id,
      token: r.token_address,
      amountAtomic: r.amount_atomic,
      status: r.status,
      createdAt: r.created_at,
    })),
  });
}

/** GET /api/referrals/my-earnings/line-items?status=accrued|paid|all&limit=100&cursor=<iso> */
export async function getMyEarningsLineItems(req: Request, res: Response) {
  const me = userIdFrom(req);
  if (!me) return res.status(401).json({ error: "missing X-User-Id" });

  const sb = getSupabase();
  const status = String(req.query.status || "all");
  const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
  const cursor = String(req.query.cursor || ""); // simple time cursor (ISO)

  let q = sb
    .from("referral_earning")
    .select("id, swap_event_id, invitee_user_id, token_address, amount_atomic, status, created_at")
    .eq("referrer_user_id", me)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status === "accrued" || status === "paid") {
    q = q.eq("status", status);
  }

  if (cursor) {
    // naive pagination: fetch items strictly older than cursor time
    q = q.lt("created_at", cursor);
  }

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  const items = (data || []).map((r: any) => ({
    id: r.id,
    swapId: r.swap_event_id,
    invitee: r.invitee_user_id,
    token: r.token_address,
    amountAtomic: r.amount_atomic,
    status: r.status,
    createdAt: r.created_at,
  }));

  const nextCursor = items.length ? items[items.length - 1].createdAt : null;

  return res.json({ items, nextCursor });
}
