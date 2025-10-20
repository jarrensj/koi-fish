import { Router } from "express";
import tradeBuy from "./trade.routes.ts";
import algoRoutes from "./algo.routes.ts";
import walletRoutes from "./wallet.routes.ts";
import allocationRoutes from "./allocation.routes.ts";

const router = Router();

router.use(tradeBuy);
router.use(algoRoutes);
router.use(walletRoutes);
router.use(allocationRoutes);

export default router;
