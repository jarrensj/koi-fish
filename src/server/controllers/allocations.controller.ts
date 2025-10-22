import { Request, Response } from "express";
import { supabase } from "../db.ts";

/**
 * Get user allocations by telegram ID
 * @param req - Express request object with telegramId query parameter
 * @param res - Express response object
 * @returns JSON response with user allocations or error message
 */
export const getAllocationsHandler = async (req: Request, res: Response) => {
  try {
    // Use authenticated user's telgramId from JWT token
    const telegramId = String(req.query.telegramId || "");
    if (!telegramId) {
      return res.status(401).json({
        code: "UNAUTHORIZED",
        message: "User not authenticated.",
      });
    }

    // find user
    const { data: user, error: uerr } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_id", telegramId)
      .maybeSingle();
    if (uerr || !user) {
      console.error("[/api/allocations] USER_CREATION_ERROR", uerr);
      return res.status(404).json({
        code: "DB_ERROR",
        message: "Failed to create user record.",
        details: uerr?.message || "Unknown error creating user.",
      });
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
      return res.status(500).json({
        code: "DB_ERROR",
        message: "Failed to fetch user allocations.",
        details: error.message,
      });
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
  } catch (error: any) {
    console.error("Error in getAllocationsHandler:", error);
    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Internal server error.",
      details: error?.message,
    });
  }
};

/**
 * Enable allocation for a user and algorithm
 * @param req - Express request object with { telegramId, algoId, amountSol } in body
 * @param res - Express response object
 * @returns JSON response with allocation details or error message
 */
export const enableAllocationHandler = async (req: Request, res: Response) => {
  try {
    // Use authenticated user's telegramId from JWT token
    const telegramId = req.user?.telegramId;
    if (!telegramId) {
      return res.status(401).json({
        code: "UNAUTHORIZED",
        message: "User not authenticated.",
      });
    }

    const { algoId, amountSol } = req.body || {};
    if (!algoId || !(Number(amountSol) > 0)) {
      return res.status(400).json({
        code: "BAD_INPUT",
        message: "algoId and amountSol are required.",
      });
    }

    // resolve user (ensure row exists)
    const { data: userExisting } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    let userId = userExisting?.id as string | undefined;
    if (!userId) {
      const { data: created, error: uerr } = await supabase
        .from("users")
        .insert({ telegram_id: telegramId })
        .select("id")
        .single();
      if (uerr || !created) {
        console.error("[/api/allocations/enable] USER_CREATION_ERROR", uerr);
        return res.status(500).json({
          code: "DB_ERROR",
          message: "Failed to create user record.",
          details: uerr?.message || "Unknown error creating user.",
        });
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

    // Add max limit check
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
      return res.status(500).json({
        code: "DB_ERROR",
        message: "Failed to create/update allocation.",
        details: error.message,
      });
    }

    return res.json({
      allocationId: alloc.id,
      algoCode: algo.code,
      amountSol: alloc.allocated_sol,
      status: alloc.status,
    });
  } catch (error: any) {
    console.error("Error in enableAllocationHandler:", error);
    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Internal server error.",
      details: error?.message,
    });
  }
};

/**
 * Disable allocation for a user and algorithm
 * @param req - Express request object with { telegramId, algoId } in body
 * @param res - Express response object
 * @returns JSON response with disabled allocation details or error message
 */
export const disableAllocationHandler = async (req: Request, res: Response) => {
  try {
    // Use authenticated user's telegramId from JWT token
    const telegramId = req.user?.telegramId;
    if (!telegramId) {
      return res.status(401).json({
        code: "UNAUTHORIZED",
        message: "User not authenticated.",
      });
    }

    const { algoId } = req.body || {};
    if (!algoId) {
      return res.status(400).json({
        code: "BAD_INPUT",
        message: "algoId is required.",
      });
    }

    const { data: user, error: uerr } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_id", telegramId)
      .maybeSingle();
    if (uerr || !user) {
      console.error("[/api/allocations] USER_CREATION_ERROR", uerr);
      return res.status(404).json({
        code: "DB_ERROR",
        message: "Failed to create user record.",
        details: uerr?.message || "Unknown error creating user.",
      });
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
      return res.status(500).json({
        code: "DB_ERROR",
        message: "Failed to disable allocation.",
        details: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({ code: "ALLOCATION_NOT_FOUND" });
    }

    return res.json({ algoCode: algo.code, status: "off" });
  } catch (error: any) {
    console.error("Error in disableAllocationHandler:", error);
    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Internal server error.",
      details: error?.message,
    });
  }
};
