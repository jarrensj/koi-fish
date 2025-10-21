import { Request, Response } from "express";
import { supabase } from "../db.ts";

/**
 * Get a list of active algorithms
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with active algorithms or error message
 */
export const getAlgosHandler = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("algos")
      .select("code, name, desc, status, min_alloc_sol, fee_bps")
      .eq("status", "active")
      .order("code", { ascending: true });

    if (error) {
      console.error("[/api/algos] DB_ERROR:", error);
      return res.status(500).json({
        code: "DB_ERROR",
        message: "Failed to fetch available algorithms.",
        details: error.message,
      });
    }
    return res.json(data ?? []);
  } catch (error: any) {
    console.error("Error in getAlgosHandler:", error);
    return res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Internal server error.",
      details: error?.message,
    });
  }
};
