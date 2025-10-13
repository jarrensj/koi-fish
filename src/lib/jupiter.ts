/**
 * Purpose:
 * - Jupiter client for the first PR: only SOL → token swaps.
 * - Keeps a modular 3-step flow (getQuote → buildSwapTx → sendSwap) so
 *   you can easily add sell/other routes later without rewriting.

 * Used by:
 * - controllers/trade.controller.ts → calls buyWithSol(...)
 *
 * Env (optional overrides):
 * - JUP_API_BASE_URL (defaults to https://lite-api.jup.ag)
 * - JUP_QUOTE_URL, JUP_SWAP_URL (override the base if needed)
 */

import fetch from "node-fetch";
import {
  PublicKey,
  VersionedTransaction,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

/** Local WSOL mint (keep self-contained to avoid cross-module coupling). */
const WSOL_MINT = "So11111111111111111111111111111111111111112";

/** Prefer lite endpoints (fewer DNS hiccups) */
const JUP_API_BASE_URL = process.env.JUP_API_BASE_URL || "https://lite-api.jup.ag";
const JUP_QUOTE = process.env.JUP_QUOTE_URL || `${JUP_API_BASE_URL}/swap/v1/quote`;
const JUP_SWAP  = process.env.JUP_SWAP_URL  || `${JUP_API_BASE_URL}/swap/v1/swap`;

/** Subset of fields we actually read from the quote response. */
export type JupQuote = {
  inputMint: string;
  outputMint: string;
  inAmount: string;            // lamports of input
  outAmount: string;           // raw units of output
  routePlan?: unknown[];       // non-empty when a route exists
  outputMintDecimals?: number; // helpful for pretty-printing
};

/**
 * getQuote
 * Fetch a Jupiter quote/route for an ExactIn swap.
 * @param inputMint        base58 mint (e.g., WSOL)
 * @param outputMint       base58 output mint
 * @param amountLamports   bigint input amount in lamports
 * @param slippageBps      slippage tolerance in bps (100 = 1%)
 */
export async function getQuote(
  inputMint: string,
  outputMint: string,
  amountLamports: bigint,
  slippageBps: number
): Promise<JupQuote> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amountLamports.toString(),
    slippageBps: String(slippageBps),
    swapMode: "ExactIn",
  });

  const res = await fetch(`${JUP_QUOTE}?${params.toString()}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Quote failed ${res.status}: ${await res.text()}`);
  return (await res.json()) as JupQuote;
}

/**
 * buildSwapTx
 * Ask Jupiter to build a VersionedTransaction based on a quote.
 * @param quote                       the quote from getQuote
 * @param user                        public key that will sign/send
 * @param priorityFeeMicrolamports    optional priority fee
 */
export async function buildSwapTx(
  quote: JupQuote,
  user: PublicKey,
  priorityFeeMicrolamports = 0
): Promise<VersionedTransaction> {
  const body: Record<string, any> = {
    quoteResponse: quote,
    userPublicKey: user.toBase58(),
    wrapAndUnwrapSol: true, // auto-handle WSOL
  };

  // Common prioritization knobs (Jupiter supports multiple variants).
  if (priorityFeeMicrolamports > 0) {
    body.dynamicComputeUnitLimit = true;
    body.computeUnitPriceMicroLamports = priorityFeeMicrolamports;
    // Alternative (another supported shape in some API versions):
    // body.prioritizationFeeLamports = { priorityFeeLamports: String(priorityFeeMicrolamports) };
  }

  const res = await fetch(JUP_SWAP, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Swap build failed ${res.status}: ${await res.text()}`);

  const { swapTransaction } = (await res.json()) as { swapTransaction: string };
  return VersionedTransaction.deserialize(Buffer.from(swapTransaction, "base64"));
}

/**
 * sendSwap
 * Sign the built transaction with the given wallet and (unless dryRun) send it.
 * @param conn     Solana connection
 * @param tx       VersionedTransaction returned by buildSwapTx
 * @param wallet   Keypair that will sign
 * @param opts     { dryRun?: boolean } — if true, do not broadcast
 * @returns        signature string, or null when dryRun=true
 */
export async function sendSwap(
  conn: Connection,
  tx: VersionedTransaction,
  wallet: Keypair,
  { dryRun = true }: { dryRun?: boolean } = {}
): Promise<string | null> {
  tx.sign([wallet]);
  if (dryRun) return null;

  const sig = await conn.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });
  await conn.confirmTransaction(sig, "confirmed");
  return sig;
}

/**
 * buyWithSol
 * Orchestration helper for this PR: swap an exact SOL amount into `outputMint`.
 * Steps: getQuote → buildSwapTx → sendSwap
 * @returns { tx, sig, quote } so the controller can return data to the client
 */
export async function buyWithSol(
  conn: Connection,
  wallet: Keypair,
  outputMint: string,
  amountSol: number,
  slippageBps: number,
  priorityFeeMicrolamports: number,
  dryRun: boolean
): Promise<{ tx: VersionedTransaction; sig: string | null; quote: JupQuote }> {
  const lamports = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));
  const quote = await getQuote(WSOL_MINT, outputMint, lamports, slippageBps);

  if (!quote?.routePlan || (Array.isArray(quote.routePlan) && quote.routePlan.length === 0)) {
    throw new Error("No Jupiter route found (SOL → token).");
  }

  const tx = await buildSwapTx(quote, wallet.publicKey, priorityFeeMicrolamports);
  const sig = await sendSwap(conn, tx, wallet, { dryRun });
  return { tx, sig, quote };
}
