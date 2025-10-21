/** Routes for referrals (Phase 1) */
import { Router } from "express";
import {
  postGenerateInviteCode,
  postAttributeReferral,
  getMyInviteCode,
  getMyInvitees,
  getMyInviteCount,
} from "../controllers/referrals.controller.ts";

const route = Router();

/**
 * TEMP AUTH NOTE:
 * Until your real auth is wired, pass a header:
 *   X-User-Id: <uuid of app_user.id>
 */
route.post("/api/referrals/invite-code", postGenerateInviteCode);
route.post("/api/referrals/attribute", postAttributeReferral);
route.get("/api/referrals/my-invite-code", getMyInviteCode);
route.get("/api/referrals/my-invitees", getMyInvitees);
route.get("/api/referrals/my-invite-count", getMyInviteCount);

export default route;
