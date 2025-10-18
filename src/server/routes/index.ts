import { Router } from "express";
import tradeBuy from "./trade.routes.ts";
import algoRoutes from "./algo.routes.ts";

const router = Router();

router.use(tradeBuy);
router.use(algoRoutes);

export default router;
