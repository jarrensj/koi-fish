/**
 * Solana cadence handler: SOL -> SPL token (ExactIn) via Jupiter.
 */

import { isNativeSymbol } from "../../../lib/shared/chains.ts";
import { getConnection, loadKeypair } from "../../../lib/solana/solWallet.ts";
import { buyWithSol } from "../../../lib/solana/jupiter.ts";
import type { InputSol } from "./types.ts";

export async function handleSol(input: InputSol) {
  const {
    sellToken,
    buyToken,
    amount,
    slippageBps = Number(process.env.SLIPPAGE_BPS || 100),
    priorityFee = 0,
  } = input;

  // v1 only supports SOL -> token
  if (!isNativeSymbol("sol", sellToken)) {
    throw new Error("For Solana v1, only SOL→token is supported (sellToken must be SOL)");
  }

  const conn = getConnection();
  // For now env-based keypair; later: load by `public_wallet` from DB if needed
  const wallet = loadKeypair();

  const { sig, quote } = await buyWithSol(
    conn,
    wallet,
    buyToken,
    Number(amount),
    slippageBps,
    Number(priorityFee)
  );

  const outDecimals = typeof quote.outputMintDecimals === "number" ? quote.outputMintDecimals : 6;
  const estOut = Number(quote.outAmount) / 10 ** outDecimals;

  return {
    success: true as const,
    chain: "sol",
    transactionSignature: sig,
    estOut,
    quote,
  };
}
