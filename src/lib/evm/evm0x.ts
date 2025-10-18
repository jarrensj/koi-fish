/**
 * 0x v2 (allowance-holder) swap helpers for EVM chains.
 * - get0xQuote: fetch ExactIn quote (unified v2 endpoint + API key)
 * - ensureAllowance: set ERC-20 allowance when selling a token
 * - send0xSwap: broadcast
 * - displayToOnChain / getTokenDecimals / buildSwapPreview: utils
 *
 * Notes:
 * - v2 uses the native ETH sentinel address 0xEeee... (NOT "ETH") in params.
 * - We pass `chainId`, `taker`, and `slippageBps` to the v2 endpoint.
 * - Keep ZEROX_API_KEY in env; do not log secrets or full payloads in prod.
 */

import fetch from "node-fetch";
import { Wallet, Contract, parseUnits, formatUnits } from "ethers";
import { CHAINS, type ChainKey, isNativeSymbol, requireEnv } from "../shared/chains.ts";

// Minimal ERC-20 ABI (read-only + approve)
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function balanceOf(address) view returns (uint256)"
];

/** 0x v2 native ETH sentinel (use this instead of "ETH" in query params) */
export const NATIVE_ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

/** Subset of 0x v2 quote we actually use. */
export type OxQuote = {
  allowanceTarget?: string;
  sellAmount?: string;
  buyAmount?: string;
  minBuyAmount?: string;
  slippageBps?: number;
  issues?: unknown;
  route?: unknown;
  transaction: {
    to: string;
    data: string;
    value?: string;     // hex string; present for native sells
    gas?: string;       // optional
    gasPrice?: string;  // optional
  };
};

/** Map user input token → 0x v2 param (use sentinel for native). */
function toV2Param(chain: ChainKey, token: string): string {
  const tokenTrim = token.trim();
  if (isNativeSymbol(chain, tokenTrim) || tokenTrim.toLowerCase() === NATIVE_ETH.toLowerCase()) {
    return NATIVE_ETH;
  }
  return tokenTrim;
}

/** Fetch a 0x v2 quote (ExactIn). */
export async function get0xQuote(opts: {
  chain: ChainKey;
  sellToken: string;            // "ETH" (native) or 0x address
  buyToken: string;             // "ETH" (native) or 0x address
  sellAmountOnChain: string;     // integer string
  taker: string;                // taker EOA
  slippageBps?: number;
}): Promise<OxQuote> {
  const {
    chain,
    sellToken,
    buyToken,
    sellAmountOnChain,
    taker,
    slippageBps = Number(process.env.SLIPPAGE_BPS || 100),
  } = opts;

  if (!CHAINS[chain]?.isEvm) throw new Error(`0x v2 supports only EVM chains; got ${chain}`);

  const baseUrl = process.env.OX_V2_QUOTE_URL?.trim()
    || "https://api.0x.org/swap/allowance-holder/quote";

  const apiKey  = requireEnv("ZEROX_API_KEY");
  const chainId = CHAINS[chain].chainId!;

  // IMPORTANT: v2 wants the 0x native sentinel; do NOT pass "ETH"
  const v2Sell = toV2Param(chain, sellToken);
  const v2Buy  = toV2Param(chain, buyToken);

  const params = new URLSearchParams({
    chainId: String(chainId),
    sellToken: v2Sell,
    buyToken: v2Buy,
    sellAmount: sellAmountOnChain,
    taker,
    slippageBps: String(slippageBps), // v2 uses BPS (e.g., 100 -> 1%)
  });

  const url = `${baseUrl}?${params.toString()}`;

  // Light logging only in dev
  if ((process.env.NODE_ENV || "development") !== "production") {
    console.debug("[0x v2] GET", url);
  }

  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "0x-api-key": apiKey,
      "0x-version": "v2",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`0x v2 quote failed ${res.status}: ${body}`);
  }

  // v2 returns `transaction: { to, data, value, gas, gasPrice }` plus other fields
  const quote = (await res.json()) as OxQuote;
  if (!quote?.transaction?.to || !quote?.transaction?.data) {
    throw new Error("0x v2 quote missing transaction fields");
  }
  return quote;
}

/** Ensure ERC-20 allowance covers the sell amount (no-op for native). */
export async function ensureAllowance(opts: {
  wallet: Wallet;
  token: string;            // ERC-20 address
  spender: string;          // allowanceTarget from quote
  amountOnChain: bigint;     // required allowance
}) {
  const { wallet, token, spender, amountOnChain } = opts;
  const erc20 = new Contract(token, ERC20_ABI, wallet);
  const current: bigint = await erc20.allowance(await wallet.getAddress(), spender);
  if (current >= amountOnChain) return;
  const tx = await erc20.approve(spender, amountOnChain);
  await tx.wait(1);
}

export async function send0xSwap(opts: {
  wallet: Wallet;
  quote: OxQuote | any;   // tolerate v1/v2 shapes
}) {
  const { wallet, quote } = opts;

  // Support both shapes:
  const to = quote.to ?? quote.transaction?.to;
  const data = quote.data ?? quote.transaction?.data;
  const valueHex = (quote.value ?? quote.transaction?.value ?? "0x0") as string;

  if (!to || !data) {
    throw new Error("0x quote missing transaction fields (to/data).");
  }

  // Build the request for ethers (requires BigInt value)
  const txReq = {
    to,
    data,
    value: BigInt(valueHex),
  } as const;

  const tx = await wallet.sendTransaction(txReq);
  const receipt = await tx.wait(1);

  if (!receipt) {
    return { hash: tx.hash, status: "replaced_or_dropped" };
  }

  // Sanitize bigint fields for JSON
  return {
    hash: tx.hash,
    status: receipt.status ? "success" : "reverted",
    blockNumber: Number(receipt.blockNumber),
    gasUsed: receipt.gasUsed?.toString(),
    cumulativeGasUsed: receipt.cumulativeGasUsed?.toString(),
    logs: undefined, // omit noisy arrays; add back if you want
  };
}

/** Convert human amount to atomic units using token decimals (18 for native). */
export async function displayToOnChain(opts: {
  wallet: Wallet;
  chain: ChainKey;
  token: string;    // ERC-20 address or native symbol ("ETH")
  amount: number;
}): Promise<{ onChain: bigint; decimals: number }> {
  const { wallet, chain, token, amount } = opts;

  // Native path (ETH on all EVM chains in this project)
  if (isNativeSymbol(chain, token) || token.toLowerCase() === NATIVE_ETH.toLowerCase()) {
    const onChain = parseUnits(String(amount), 18);
    return { onChain, decimals: 18 };
  }

  // ERC-20 path
  const erc20 = new Contract(token, ERC20_ABI, wallet.provider);
  const decimals: number = await erc20.decimals();
  const onChain = parseUnits(String(amount), decimals);
  return { onChain, decimals };
}

/** Simple in-memory decimals cache to reduce RPC calls. */
const _decimalsCache = new Map<string, number>();
export async function getTokenDecimals(provider: Wallet["provider"], tokenOrNative: string) {
  if (
    tokenOrNative.toUpperCase() === "ETH" ||
    tokenOrNative.toLowerCase() === NATIVE_ETH.toLowerCase()
  ) return 18;

  const key = tokenOrNative.toLowerCase();
  if (_decimalsCache.has(key)) return _decimalsCache.get(key)!;
  const erc20 = new Contract(tokenOrNative, ERC20_ABI, provider);
  const d: number = await erc20.decimals();
  _decimalsCache.set(key, d);
  return d;
}

/** Build a human-friendly preview from a v2 0x quote. */
export async function buildSwapPreview(opts: {
  provider: Wallet["provider"];
  quote: OxQuote;
  sellToken: string;          // optional for amounts; pass if you want exact unit conversion
  buyToken: string;           // optional for amounts; pass if you want exact unit conversion
}) {
  const { provider, quote, sellToken, buyToken } = opts;
  const tx = quote.transaction;

  const sellDec = sellToken ? await getTokenDecimals(provider, sellToken) : 18;
  const buyDec  = buyToken  ? await getTokenDecimals(provider, buyToken)  : 6;

  const sellDisplay = quote.sellAmount ? formatUnits(BigInt(quote.sellAmount), sellDec) : null;
  const buyDisplay  = quote.buyAmount  ? formatUnits(BigInt(quote.buyAmount),  buyDec)  : null;

  const gas = tx.gas ? BigInt(tx.gas) : 0n;
  const gasPrice = tx.gasPrice ? BigInt(tx.gasPrice) : 0n;
  const valueWei = tx.value ? BigInt(tx.value) : 0n;
  const estNetworkFeeWei = gas * gasPrice;

  return {
    amounts: {
      sellOnChain: quote.sellAmount ?? null,
      buyOnChain:  quote.buyAmount ?? null,
      sellDisplay,
      buyDisplay,
      minbuyDisplay: quote.minBuyAmount ? formatUnits(BigInt(quote.minBuyAmount), buyDec) : null,
      slippageBps: quote.slippageBps ?? null,
    },
    transactionSignature: {
      to: tx.to,
      dataBytes: tx.data ? (tx.data.length - 2) / 2 : 0,
      valueEth: formatUnits(valueWei, 18),
      gasUnits: gas.toString(),
      gasPriceGwei: gasPrice ? (Number(gasPrice) / 1e9).toFixed(3) : null,
      estNetworkFeeEth: estNetworkFeeWei ? formatUnits(estNetworkFeeWei, 18) : null,
    },
    issues: quote.issues ?? null,
  };
}
