import { Router } from "express";
import { postCadenceTrader } from "../controllers/algo-controller/index.ts";
import { supabase } from "../db.ts"; // ensure this exists and exports a supabase client

const route = Router();

// /**
// * POST /api/algo/cadence-trader
// * Body: {
// * public_wallet: string,
// * sellToken: string,
// * buyToken: string,
// * blockchain: "sol"|"eth"|"base"|"zora",
// * amount: number,
// * dryRun?: boolean,
// * slippageBps?: number,
// * priorityFee?: number
// * }
// */
route.post("/api/algo/cadence-trader", postCadenceTrader);

// GET /api/algos — list active algos for the bot
route.get("/api/algos", async (_req, res) => {
  const { data, error } = await supabase
    .from("algos")
    .select("code, name, desc, status, minAllocSol, feeBps")
    .eq("status", "active")
    .order("code", { ascending: true });

  if (error) {
    console.error("[/api/algos] DB_ERROR:", error);
    return res.status(500).json({ code: "DB_ERROR" });
  }
  return res.json(data ?? []);
});

export default route;
