/**
 * Dispatcher for POST /api/algo/cadence-trader
 * - Validates/reads body
 * - Narrows by `blockchain`
 * - Calls the correct chain handler
 *
 * TODO(SECURITY):
 * - Require KOI_API_KEY (or session) before parsing the body.
 * - When Privy is live, make `public_wallet` required again and verify ownership.
 * - Add per-IP / per-user rate limiting and request-id logging.
 */

import type { Request, Response } from "express";
import { CHAINS } from "../../../lib/shared/chains.ts";
import { CadenceTraderSchema, formatZodError } from "../../../lib/shared/validation.ts";
import type { InputSol, InputEvm } from "./types.ts";
import { handleSol } from "./sol.handler.ts";
import { handleEvm } from "./evm.handler.ts";
import type { CadenceTraderRequest } from "../../../lib/shared/types.ts";

export async function postCadenceTrader(req: Request, res: Response) {
  // TODO(SECURITY): enforce auth (e.g., KOI_API_KEY) before proceeding
  // const auth = req.headers.authorization;
  // if (!auth || !isValidKey(auth)) return res.status(401).json({ success:false, error:"unauthorized" });

  const parsed = CadenceTraderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid payload", issues: formatZodError(parsed.error) });
  }

  const body = parsed.data as CadenceTraderRequest;
  const chain = body.blockchain;

  if (!CHAINS[chain]) {
    return res.status(400).json({ success: false, error: `Unsupported chain: ${chain}` });
  }

  try {
    // DEV fallback: if public_wallet is missing, log and proceed (server signer used in handlers)
    if (!body.public_wallet) {
      console.warn("[cadence-trader] no public_wallet provided; using server signer (DEV fallback)");
    }

    if (chain === "sol") {
      // InputSol includes: sellToken, buyToken, amount, slippageBps?, priorityFee?, public_wallet?
      const result = await handleSol(body as InputSol);
      return res.json(result);
    } else {
      // EVM not the focus right now, but keep parity
      const result = await handleEvm(body as InputEvm);
      return res.json(result);
    }
  } catch (e: any) {
    return res.status(400).json({ success: false, error: e?.message || String(e) });
  }
}
