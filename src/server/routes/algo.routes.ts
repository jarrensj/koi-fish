import { Router } from "express";
import { postCadenceTrader } from "../controllers/algo-controller/index.ts";
import { getAlgosHandler } from "../controllers/algos.controller.ts";

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
route.get("/api/algos", getAlgosHandler);

export default route;
