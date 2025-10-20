import { Router } from "express";
import { supabase } from "../db.ts";

const route = Router();

/** GET /api/allocations?telegramId=123 */
route.get("/api/allocations", async (req, res) => {
  const telegramId = String(req.query.telegramId || "");
  if (!telegramId) {
    return res.status(400).json({ code: "BAD_INPUT" });
  }

  // find user
  const { data: user, error: uerr } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .single();
  if (uerr || !user) {
    return res.status(404).json({ code: "USER_NOT_FOUND" });
  }

  // list allocations joined with algos for names/codes
  const { data, error } = await supabase
    .from("allocations")
    .select(
      `
        id, status, allocated_sol, pnl_sol, updated_at,
        algo:algos ( id, code, name )
        `
    )
    .eq("user_id", user.id);

  if (error) {
    console.error("[/api/allocations] DB_ERROR", error);
    return res.status(500).json({ code: "DB_ERROR" });
  }
  return res.json(
    (data || []).map((row: any) => ({
      allocationId: row.id,
      status: row.status,
      allocatedSol: row.allocated_sol,
      pnlSol: row.pnl_sol,
      updatedAt: row.updated_at,
      algo: row.algo,
    }))
  );
});

/** POST /api/allocations/enable
 *  body: { telegramId: string, algoId: string (code or uuid), amountSol: number }
 */
route.post("/api/allocations/enable", async (req, res) => {
  const { telegramId, algoId, amountSol } = req.body || {};
  if (!telegramId || !algoId || !(Number(amountSol) > 0)) {
    return res.status(400).json({ code: "BAD_INPUT" });
  }

  // resolve user (ensure row exists)
  const { data: userExisting } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .single();

  let userId = userExisting?.id as string | undefined;
  if (!userId) {
    const { data: created, error: uerr } = await supabase
      .from("users")
      .insert({ telegram_id: telegramId })
      .select("id")
      .single();
    if (uerr || !created) {
      return res.status(500).json({ code: "DB_ERROR" });
    }
    userId = created.id;
  }

  // code (case-insensitive)
  let algo = null as null | {
    id: string;
    code: string;
    status: string;
    min_alloc_sol: number;
  };

  const byCode = await supabase
    .from("algos")
    .select("id, code, status, min_alloc_sol")
    .ilike("code", String(algoId)) // 'dca_sol' will match 'DCA_SOL'
    .maybeSingle();

  if (byCode.data) {
    algo = byCode.data as any;
  } else {
    const byId = await supabase
      .from("algos")
      .select("id, code, status, min_alloc_sol")
      .eq("id", String(algoId))
      .maybeSingle();
    if (byId.data) algo = byId.data as any;
  }

  if (!algo) {
    return res.status(404).json({ code: "ALGO_NOT_FOUND" });
  }

  if (algo.status !== "active") {
    return res.status(409).json({ code: "ALGO_PAUSED" });
  }
  // validation for amountSol
  if (Number(amountSol) < Number(algo.min_alloc_sol)) {
    return res.status(409).json({ code: "MIN_ALLOC" });
  }
  // Add this simple max limit check
  const MAX_ALLOCATION_SOL = Number(process.env.MAX_ALLOCATION_SOL) || 1000;
  if (Number(amountSol) > MAX_ALLOCATION_SOL) {
    return res.status(400).json({
      code: "AMOUNT_TOO_LARGE",
      message: `Amount cannot exceed ${MAX_ALLOCATION_SOL} SOL`,
    });
  }

  // upsert (update and insert) allocation: set ON and amount
  const { data: alloc, error } = await supabase
    .from("allocations")
    .upsert(
      {
        user_id: userId,
        algo_id: algo.id,
        status: "on",
        allocated_sol: amountSol,
      },
      { onConflict: "user_id,algo_id" }
    )
    .select("id, status, allocated_sol")
    .single();

  if (error) {
    console.error("[/api/allocations/enable] DB_ERROR", error);
    return res.status(500).json({ code: "DB_ERROR" });
  }

  return res.json({
    allocationId: alloc.id,
    algoCode: algo.code,
    amountSol: alloc.allocated_sol,
    status: alloc.status,
  });
});

/** POST /api/allocations/disable
 *  body: { telegramId: string, algoId: string (code or uuid) }
 */
route.post("/api/allocations/disable", async (req, res) => {
  const { telegramId, algoId } = req.body || {};
  if (!telegramId || !algoId) {
    return res.status(400).json({ code: "BAD_INPUT" });
  }

  const { data: user, error: uerr } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .single();
  if (uerr || !user) {
    return res.status(404).json({ code: "USER_NOT_FOUND" });
  }

  let algo: { id: string; code: string } | null = null;

  const byCode = await supabase
    .from("algos")
    .select("id, code")
    .ilike("code", String(algoId))
    .maybeSingle();
  if (byCode.data) {
    algo = byCode.data as any;
  }

  if (!algo) {
    const byId = await supabase
      .from("algos")
      .select("id, code")
      .eq("id", String(algoId))
      .maybeSingle();
    if (byId.data) {
      algo = byId.data as any;
    }
  }

  if (!algo) {
    return res.status(404).json({ code: "ALGO_NOT_FOUND" });
  }

  // update allocation to off
  const { data, error } = await supabase
    .from("allocations")
    .update({ status: "off" })
    .eq("user_id", user.id)
    .eq("algo_id", algo.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[/api/allocations/disable] DB_ERROR", error);
    return res.status(500).json({ code: "DB_ERROR" });
  }
  if (!data) {
    return res.status(404).json({ code: "ALLOCATION_NOT_FOUND" });
  }

  return res.json({ algoCode: algo.code, status: "off" });
});

export default route;
