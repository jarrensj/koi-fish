import { Router } from "express";
import tradeBuy from "./trade.routes.ts";
import algoRoutes from "./algo.routes.ts";
import walletRoutes from "./wallet.routes.ts";
import referralRoutes from "./referrals.routes.ts"

const router = Router();

router.use(tradeBuy);
router.use(algoRoutes);
router.use(walletRoutes);
router.use(referralRoutes);

export default router;
