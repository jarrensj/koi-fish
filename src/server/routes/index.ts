import { Router } from "express";
import tradeBuy from "./trade.routes.ts";
import walletRoutes from "./wallet.routes.ts";

const router = Router();

// API routes
router.use("/api/trade", tradeBuy);
router.use("/api/wallets", walletRoutes);

export default router;
