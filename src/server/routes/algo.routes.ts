import { Router } from "express";
import { postCadenceTrader } from "../controllers/algo-controller/index.ts";
import { getAlgosHandler } from "../controllers/algos.controller.ts";
import { authenticateToken } from "../middleware/auth.ts";

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
route.post("/api/algo/cadence-trader", authenticateToken, postCadenceTrader);

/** GET /api/algos
 *  Requires: Authorization header with Bearer token
 *  Returns: List of active algorithms
 */
route.get("/api/algos", authenticateToken, getAlgosHandler);

export default route;
