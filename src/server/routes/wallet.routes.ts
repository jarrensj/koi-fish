import { Router } from "express";
import { createWallet } from "../controllers/wallet.controller.ts";

const router = Router();

// Create wallet route
router.post("/create", createWallet);

export default router;
