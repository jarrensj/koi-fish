import { Router } from "express";
import {
  getAllocationsHandler,
  enableAllocationHandler,
  disableAllocationHandler,
} from "../controllers/allocations.controller.ts";

const route = Router();

/** GET /api/allocations?telegramId=123 */
route.get("/api/allocations", getAllocationsHandler);

/** POST /api/allocations/enable
 *  body: { telegramId: string, algoId: string (code or uuid), amountSol: number }
 */
route.post("/api/allocations/enable", enableAllocationHandler);

/** POST /api/allocations/disable
 *  body: { telegramId: string, algoId: string (code or uuid) }
 */
route.post("/api/allocations/disable", disableAllocationHandler);

export default route;
