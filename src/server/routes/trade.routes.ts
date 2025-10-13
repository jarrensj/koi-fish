import { Router } from "express";
import { postBuy } from "../controllers/trade.controller.ts";
const route = Router();

/**
 * POST /api/trade/buy
 * Body: { mint: string, amountSol: number, dryRun?: boolean }
 * Swaps SOL -> <mint> using the wallet from .env.local
 */
route.post("/api/trade/buy", postBuy);

export default route;
