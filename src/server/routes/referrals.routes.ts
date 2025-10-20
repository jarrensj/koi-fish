import { Router } from "express";
import {
  postGenerateInviteCode,
  postAttributeReferral,
  getMyInviteCode,
  getMyInvitees,
  getMyInviteCount,
} from "../controllers/referrals.controller.ts";
import {
  getMyEarningsSummary,
  getMyEarningsLineItems,
} from "../controllers/referrals.earnings.controller.ts";

const route = Router();

/**
 * TEMP AUTH NOTE:
 * Until your real auth is wired, pass a header:
 *   X-User-Id: <uuid of app_user.id>
 */

// invite code + attribution endpoints
route.post("/api/referrals/invite-code", postGenerateInviteCode);
route.post("/api/referrals/attribute", postAttributeReferral);
route.get("/api/referrals/my-invite-code", getMyInviteCode);
route.get("/api/referrals/my-invitees", getMyInvitees);
route.get("/api/referrals/my-invite-count", getMyInviteCount);

// earnings summary + line-items
route.get("/api/referrals/my-earnings/summary", getMyEarningsSummary);
route.get("/api/referrals/my-earnings/line-items", getMyEarningsLineItems);

export default route;
