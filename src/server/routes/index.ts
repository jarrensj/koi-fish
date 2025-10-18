import { Router } from "express";
import tradeBuy from "./trade.routes.ts";
import walletRoutes from "./wallet.routes.ts";

const router = Router();

router.use(tradeBuy);
router.use(walletRoutes);

export default router;
