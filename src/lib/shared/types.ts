/**
 * Make the schema the source of truth for request typing.
 * Keep response types here as before.
 */
import type { CadenceTraderPayload } from "./validation.ts";
import type { ChainKey } from "./chains.ts";

// Branded helper (optional) to avoid mixing arbitrary strings with real Privy user IDs
export type PrivyUserId = string & { readonly __brand: "PrivyUserId" };

// Request type == normalized schema output
export type CadenceTraderRequest = CadenceTraderPayload;

// --- Responses (unchanged; keep what you already use) ---

type SuccessBase = {
  success: true;
  chain: ChainKey;
  quote?: unknown;
};

export type SolanaSuccessResponse = SuccessBase & {
  chain: "sol";
  transactionSignature: string;
  estOut?: number;
};

export type EvmSuccessResponse = SuccessBase & {
  chain: "eth" | "base" | "zora";
  transactionHash: string;
  result?: unknown;
};

export type ErrorIssue = { path: string; message: string };

export type ErrorResponse = {
  success: false;
  error: string;
  issues?: ErrorIssue[];
};

export type CadenceTraderResponse =
  | SolanaSuccessResponse
  | EvmSuccessResponse
  | ErrorResponse;
