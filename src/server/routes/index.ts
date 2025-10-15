import { Router } from "express";
import tradeBuy from "./trade.routes.ts";

const router = Router();

router.use(tradeBuy);

export default router;
