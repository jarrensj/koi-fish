import { Router } from "express";
import { getTgHealth } from "../controllers/tgHealth.controller.ts";

const route = Router();

route.get("/api/tg/health", getTgHealth);

export default route;
