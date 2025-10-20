/**
 * Referral
 * - Generate (or return existing) invite code for the current user
 * - Attribute a new user to an inviter using ?invite=CODE (or body.code)
 * - Read: my code, my invitees, my invite count
 *
 * TEMP AUTH: read user id from header "X-User-Id" until your auth is wired.
 */
import type { Request, Response } from "express";
import { nanoid } from "nanoid";
import { getSupabase } from "../../lib/supabase.ts";

function getUserId(req: Request): string | null {
  return (req.header("x-user-id") || "").trim() || null;
}

function referralDays(): number {
  const v = Number(process.env.REFERRAL_DURATION_DAYS || 60);
  return Number.isFinite(v) && v > 0 ? v : 60;
}

/** POST /api/referrals/invite-code */
export async function postGenerateInviteCode(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "missing X-User-Id" });

  const supabase = getSupabase();

  // 1) Return existing code if present
  const { data: existing, error: fetchError } = await supabase
    .from("invite_code")
    .select("code")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    return res.status(500).json({ error: fetchError.message });
  }

  if (existing?.code) {
    return res.json({ code: existing.code });
  }

  // 2) Create a new code (retry on rare unique collision)
  for (let i = 0; i < 3; i++) {
    const code = nanoid(8).toUpperCase();
    const { error } = await supabase
      .from("invite_code")
      .insert({ user_id: userId, code });
    
    if (!error) return res.json({ code });
    
    // Postgres unique_violation (23505)
    if ((error as any)?.code !== "23505") {
      return res.status(400).json({ error: error.message });
    }
  }

  return res.status(409).json({ error: "could not generate unique code" });
}


/** POST /api/referrals/attribute  { code: "ABCD1234" } */
export async function postAttributeReferral(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "missing X-User-Id" });

  const code = String(req.body?.code ?? "").trim().toUpperCase();
  if (!code) return res.status(400).json({ attributed: false, reason: "missing_code" });

  const supabase = getSupabase();

  // 1) Check if already attributed
  const { data: already, error: alreadyError } = await supabase
    .from("invite_attribution")
    .select("invitee_user_id")
    .eq("invitee_user_id", userId)
    .maybeSingle();

  if (alreadyError) {
    return res.status(500).json({ attributed: false, reason: alreadyError.message });
  }

  if (already) {
    return res.json({ attributed: false, reason: "already_attributed" });
  }

  // 2) Lookup inviter by code
  const { data: found, error: lookupError } = await supabase
    .from("invite_code")
    .select("user_id")
    .eq("code", code)
    .maybeSingle();

  if (lookupError) {
    return res.status(500).json({ attributed: false, reason: lookupError.message });
  }

  const inviterId = found?.user_id as string | undefined;
  if (!inviterId) {
    return res.json({ attributed: false, reason: "invalid_code" });
  }

  if (inviterId === userId) {
    return res.json({ attributed: false, reason: "self_invite_not_allowed" });
  }

  // 3) Insert attribution (no expires_at column - we derive it in queries)
  const { error } = await supabase.from("invite_attribution").insert({
    invitee_user_id: userId,
    inviter_user_id: inviterId,
    attributed_at: new Date().toISOString(),
    // NOTE: No expires_at column - it's derived as attributed_at + REFERRAL_DURATION_DAYS
  });

  if (error) {
    // Foreign key violation - user doesn't exist
    if ((error as any)?.code === "23503") {
      return res.status(404).json({ attributed: false, reason: "user_not_found" });
    }
    // Check constraint violation - self-invite blocked by DB
    if ((error as any)?.code === "23514") {
      return res.json({ attributed: false, reason: "self_invite_not_allowed" });
    }
    return res.status(400).json({ attributed: false, reason: error.message });
  }

  return res.json({ attributed: true });
}


/** GET /api/referrals/my-invite-code */
export async function getMyInviteCode(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "missing X-User-Id" });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("invite_code")
    .select("code")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data?.code) {
    return res.status(404).json({ error: "no_code_generated" });
  }

  return res.json({ code: data.code });
}


/** GET /api/referrals/my-invitees */
export async function getMyInvitees(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "missing X-User-Id" });

  const supabase = getSupabase();
  const days = referralDays();

  // Note: We derive expires_at and status in application code since there's no expires_at column
  const { data, error } = await supabase
    .from("invite_attribution")
    .select(`
      invitee_user_id,
      inviter_user_id,
      attributed_at,
      first_swap_at,
      total_swaps,
      app_user!invite_attribution_invitee_user_id_fkey (
        id,
        wallet_evm,
        wallet_sol
      )
    `)
    .eq("inviter_user_id", userId)
    .order("attributed_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const now = new Date();
  const items = (data || []).map((r: any) => {
    const attributedAt = new Date(r.attributed_at);
    const expiresAt = new Date(attributedAt.getTime() + days * 24 * 60 * 60 * 1000);
    const status = now <= expiresAt ? "active" : "expired";
    const user = r.app_user || {};
    
    return {
      invitee_user_id: r.invitee_user_id,
      attributed_at: r.attributed_at,
      expires_at: expiresAt.toISOString(),
      status,
      first_swap_at: r.first_swap_at,
      total_swaps: r.total_swaps,
      wallet_evm: user.wallet_evm ?? null,
      wallet_sol: user.wallet_sol ?? null,
    };
  });

  return res.json({ items });
}


/** GET /api/referrals/my-invite-count */
export async function getMyInviteCount(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "missing X-User-Id" });

  const supabase = getSupabase();
  const { count, error } = await supabase
    .from("invite_attribution")
    .select("*", { count: "exact", head: true })
    .eq("inviter_user_id", userId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ total_invites: count ?? 0 });
}
