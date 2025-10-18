import { Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { getConnection, loadKeypair } from "../../lib/solana/solWallet.ts";
import { buyWithSol } from "../../lib/solana/jupiter.ts";

export const postBuy = async (req: Request, res: Response) => {
  try {
    const { mint, amountSol } = req.body ?? {};
    if (!mint || !amountSol) return res.status(400).json({ success: false, error: "mint, amountSol required" });

    // Validate inputs
    new PublicKey(mint);
    const SOL = Number(amountSol);
    if (!Number.isFinite(SOL) || SOL <= 0) return res.status(400).json({ success: false, error: "amountSol must be > 0" });

    // Env-driven knobs
    const slippageBps = Number(process.env.SLIPPAGE_BPS || 100);
    const priorityMicrolamports = Number(process.env.PRIORITY_FEE_MICROLAMPORTS || 0);

    // RPC + Wallet
    const conn = getConnection();
    const wallet = loadKeypair();

    // Swap
    const { sig, quote } = await buyWithSol(conn, wallet, mint, SOL, slippageBps, priorityMicrolamports);
    const outDecimals = typeof quote.outputMintDecimals === "number" ? quote.outputMintDecimals : 6;
    const estOut = Number(quote.outAmount) / 10 ** outDecimals;

    return res.json({
      success: true,
      tx: sig,
      estOut,
    });
  } catch (e: any) {
    return res.status(400).json({ success: false, error: e?.message || String(e) });
  }
};
