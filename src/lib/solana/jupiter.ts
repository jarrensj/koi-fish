/**
 * Jupiter (Solana) swap helpers — build-only, UNSIGNED.
 *
 * This file does NOT sign or send transactions. It:
 *   1) fetches a quote (getQuote)
 *   2) builds an UNSIGNED v0 transaction for a given user pubkey (buildSwapTxUnsignedBase64)
 *   3) provides a convenience helper for SOL → SPL swaps (buildBuyWithSolUnsignedTx)
 *
 * Why unsigned?
 *   In the Privy model, your server never holds user private keys. You build an unsigned
 *   transaction (base64), then hand it to Privy to sign & broadcast on behalf of the user.
 */

 // If you're on Node 18+, `fetch` is global. If you prefer node-fetch, uncomment next line:
 // import fetch from "node-fetch";

import { PublicKey, VersionedTransaction } from "@solana/web3.js";

/** WSOL mint (use as inputMint when swapping SOL; Jupiter will wrap/unwrap if enabled) */
export const WSOL_MINT = "So11111111111111111111111111111111111111112";

/** Resolve Jupiter endpoints with your prod/dev behavior preserved */
function resolveJupiterEndpoints() {
  const JUP_API_BASE_URL = (process.env.JUP_API_BASE_URL || "https://lite-api.jup.ag").trim();
  const JUP_QUOTE = (process.env.JUP_QUOTE_URL || `${JUP_API_BASE_URL}/swap/v1/quote`).trim();
  const JUP_SWAP  = (process.env.JUP_SWAP_URL  || `${JUP_API_BASE_URL}/swap/v1/swap`).trim();

  const isProd = (process.env.NODE_ENV || "").toLowerCase() === "production";
  const usingDefaults = !process.env.JUP_QUOTE_URL || !process.env.JUP_SWAP_URL;

  // In production, force explicit config to avoid accidental wrong hosts.
  if (isProd && usingDefaults) {
    throw new Error(
      "JUP_QUOTE_URL and JUP_SWAP_URL are required in production. Set them in your environment."
    );
  }

  if (!isProd && usingDefaults) {
    // Non-fatal warning in dev
    // eslint-disable-next-line no-console
    console.warn("[jupiter] Using default lite endpoints. Set JUP_QUOTE_URL/JUP_SWAP_URL to override.");
  }

  return { JUP_QUOTE, JUP_SWAP };
}

const { JUP_QUOTE, JUP_SWAP } = resolveJupiterEndpoints();

/** Minimal quote shape we consume */
export type JupQuote = {
  inputMint: string;
  outputMint: string;
  inAmount: string;            // lamports of input (stringified)
  outAmount: string;           // raw output token units (stringified)
  routePlan?: unknown[];       // non-empty when a route exists
  outputMintDecimals?: number; // helpful for pretty-printing (sometimes provided)
};

/**
 * getQuote
 * Fetch a Jupiter route/quote for an ExactIn swap.
 *
 * @param inputMint      base58 input mint (e.g., WSOL for SOL)
 * @param outputMint     base58 output SPL mint
 * @param amountLamports bigint amount in lamports (1 SOL = 1_000_000_000 lamports)
 * @param slippageBps    slippage tolerance in bps (100 = 1%)
 * @returns              JupQuote
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

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Quote failed ${res.status}: ${text}`);
  }

  return (await res.json()) as JupQuote;
}

/**
 * buildSwapTxUnsignedBase64
 * Ask Jupiter to build a VersionedTransaction (v0) based on a quote, with the specified
 * user as fee payer — and return it **UNSIGNED** and base64-encoded.
 *
 * You’ll pass this base64 to Privy for signing & broadcasting.
 *
 * @param quote                        quote from getQuote
 * @param user                         public key that will sign/send (the end user)
 * @param priorityFeeMicrolamports     optional priority fee (micro-lamports per CU)
 * @returns                            base64-encoded, UNSIGNED VersionedTransaction
 */
export async function buildSwapTxUnsignedBase64(
  quote: JupQuote,
  user: PublicKey,
  priorityFeeMicrolamports = 0
): Promise<string> {
  const body: Record<string, any> = {
    quoteResponse: quote,
    userPublicKey: user.toBase58(),
    wrapAndUnwrapSol: true, // auto-handle WSOL around native SOL
  };

  // Optional prioritization knobs
  if (priorityFeeMicrolamports > 0) {
    body.dynamicComputeUnitLimit = true;
    body.computeUnitPriceMicroLamports = priorityFeeMicrolamports;
  }

  const res = await fetch(JUP_SWAP, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Swap build failed ${res.status}: ${text}`);
  }

  const { swapTransaction } = (await res.json()) as { swapTransaction: string };

  // Sanity-check that it’s a valid v0 transaction (still unsigned at this point)
  VersionedTransaction.deserialize(Buffer.from(swapTransaction, "base64"));

  return swapTransaction; // base64 (UNSIGNED)
}

/** Convert a human SOL amount to lamports (supports decimals) */
function toLamports(amount: number | string): bigint {
  const [int = "0", frac = ""] = String(amount).split(".");
  const frac9 = (frac + "000000000").slice(0, 9); // pad/truncate to 9
  return BigInt(int) * BigInt(1_000_000_000) + BigInt(frac9);
}

/**
 * buildBuyWithSolUnsignedTx
 * Convenience helper that performs the common SOL → SPL flow in one go:
 *   getQuote(WSOL → outputMint) → buildSwapTxUnsignedBase64 → derive estOut
 *
 * @param params.userPubkey                 user's public key (fee payer & signer)
 * @param params.outputMint                 base58 SPL mint you want to buy
 * @param params.amountSol                  human-readable SOL amount (e.g., 0.25)
 * @param params.slippageBps                slippage tolerance in bps (default in caller)
 * @param params.priorityFeeMicrolamports   optional priority fee
 * @returns { base64Tx, quote, estOut }
 *    - base64Tx: UNSIGNED v0 transaction (string)
 *    - quote:    raw Jupiter quote you can persist/return
 *    - estOut:   convenience number derived from outAmount & decimals (best-effort)
 */
export async function buildBuyWithSolUnsignedTx(params: {
  userPubkey: PublicKey;
  outputMint: string;
  amountSol: number;
  slippageBps: number;
  priorityFeeMicrolamports: number;
}): Promise<{ base64Tx: string; quote: JupQuote; estOut: number }> {
  const lamports = toLamports(params.amountSol);

  const quote = await getQuote(WSOL_MINT, params.outputMint, lamports, params.slippageBps);

  // Ensure there’s a route
  if (!quote?.routePlan || (Array.isArray(quote.routePlan) && quote.routePlan.length === 0)) {
    throw new Error("No Jupiter route found (SOL → token).");
  }

  const base64Tx = await buildSwapTxUnsignedBase64(
    quote,
    params.userPubkey,
    params.priorityFeeMicrolamports
  );

  // Best-effort pretty number for UX; safe to omit if you prefer exact strings
  const outDecimals =
    typeof quote.outputMintDecimals === "number" ? quote.outputMintDecimals : 6;
  const estOut = Number(quote.outAmount) / 10 ** outDecimals;

  return { base64Tx, quote, estOut };
}
