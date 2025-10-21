/**
 * Dispatcher for POST /api/algo/cadence-trader
 * - Validates with Zod (source of truth)
 * - Narrows by `blockchain`
 * - Passes branded/normalized inputs to the chain handlers
 */
import type { Request, Response } from "express";
import { CHAINS } from "../../../lib/shared/chains.ts";
import {
  CadenceTraderSchema,
  formatZodError,
  type CadenceTraderPayload,
} from "../../../lib/shared/validation.ts";
import { handleSol } from "./sol.handler.ts";
import { handleEvm } from "./evm.handler.ts";
import type { InputSol, InputEvm } from "./types.ts";
import type { PrivyUserId } from "../../../lib/shared/types.ts";

// tiny helper to brand only when present
const asPrivyUserId = (u?: string): PrivyUserId | undefined => (u ? (u as PrivyUserId) : undefined);

// type guards
function isSol(p: CadenceTraderPayload): p is CadenceTraderPayload & { blockchain: "sol" } {
  return p.blockchain === "sol";
}
function isEvm(p: CadenceTraderPayload): p is CadenceTraderPayload & { blockchain: "eth" | "base" | "zora" } {
  return p.blockchain === "eth" || p.blockchain === "base" || p.blockchain === "zora";
}

export async function postCadenceTrader(req: Request, res: Response) {
  const parsed = CadenceTraderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid payload", issues: formatZodError(parsed.error) });
  }

  const body: CadenceTraderPayload = parsed.data;
  const chain = body.blockchain;

  if (!CHAINS[chain]) {
    return res.status(400).json({ success: false, error: `Unsupported chain: ${chain}` });
  }

  try {
    if (isSol(body)) {
      const solInput: InputSol = {
        ...body,
        blockchain: "sol",
        userId: asPrivyUserId(body.userId), // brand if present
      };
      const result = await handleSol(solInput);
      return res.json(result);
    }

    if (isEvm(body)) {
      const evmInput: InputEvm = {
        ...body,
        blockchain: body.blockchain,        // "eth" | "base" | "zora"
        userId: asPrivyUserId(body.userId), // brand if present
      };
      const result = await handleEvm(evmInput);
      return res.json(result);
    }

    // Fallback (shouldn’t happen because of guard above)
    return res.status(400).json({ success: false, error: `Unsupported chain: ${chain}` });
  } catch (e: any) {
    return res.status(400).json({ success: false, error: e?.message || String(e) });
  }
}
