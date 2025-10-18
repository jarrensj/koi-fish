/**
 * Dispatcher for POST /api/algo/cadence-trader
 * - Validates/reads body
 * - Narrows by `blockchain`
 * - Calls the correct chain handler
 */
import type { Request, Response } from "express";
import { CHAINS} from "../../../lib/shared/chains.ts";
import { CadenceTraderSchema, formatZodError } from "../../../lib/shared/validation.ts";
import type { InputSol, InputEvm } from "./types.ts";

import { handleSol } from "./sol.handler.ts";
import { handleEvm } from "./evm.handler.ts";
import { CadenceTraderRequest } from "@lib/shared/types.ts";

export async function postCadenceTrader(req: Request, res: Response) {
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
    if (chain === "sol") {
      const result = await handleSol(body as InputSol);
      return res.json(result);
    } else {
      const result = await handleEvm(body as InputEvm);
      return res.json(result);
    }
  } catch (e: any) {
    return res.status(400).json({ success: false, error: e?.message || String(e) });
  }
}
