import { Router } from "express";
import { postCadenceTrader } from "../controllers/algo-controller/index.ts";

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


export default route;
