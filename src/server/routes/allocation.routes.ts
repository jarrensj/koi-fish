import { Router } from "express";
import {
  getAllocationsHandler,
  enableAllocationHandler,
  disableAllocationHandler,
} from "../controllers/allocations.controller.ts";
import {
  authenticateToken,
  validateAllocationInput,
} from "../middleware/auth.ts";

const route = Router();

/** GET /api/allocations
 *  Requires: Authorization header with Bearer token
 *  Returns: User's allocations (telegramId from JWT token)
 */
route.get(
  "/api/allocations",
  authenticateToken,
  getAllocationsHandler
);

/** POST /api/allocations/enable
 *  Requires: Authorization header with Bearer token
 *  Body: { algoId: string (code or uuid), amountSol: number }
 *  Note: telegramId is extracted from JWT token
 */
route.post(
  "/api/allocations/enable",
  authenticateToken,
  validateAllocationInput,
  enableAllocationHandler
);

/** POST /api/allocations/disable
 *  Requires: Authorization header with Bearer token
 *  Body: { algoId: string (code or uuid) }
 *  Note: telegramId is extracted from JWT token
 */
route.post(
  "/api/allocations/disable",
  authenticateToken,
  disableAllocationHandler
);

export default route;
