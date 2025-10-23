import { Router } from "express";
import algoRoutes from "./algo.routes.ts";
import walletRoutes from "./wallet.routes.ts";
import referralRoutes from "./referrals.routes.ts"
import allocationRoutes from "./allocation.routes.ts";

import tgHealthRoutes from "./tgHealth.routes.ts";

const router = Router();

router.use(tgHealthRoutes);

router.use(algoRoutes);
router.use(walletRoutes);
router.use(referralRoutes);
router.use(allocationRoutes);

export default router;
