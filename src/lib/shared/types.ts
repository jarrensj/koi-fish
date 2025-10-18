/**
 * Shared request/response types used by controllers and libs.
 * Keep this file dependency-free and TS-only for easy reuse.
 */

export type CadenceTraderRequest = {
  public_wallet: string;                      // signer lookup key (addr/pubkey)
  sellToken: string;                           // native symbol or token addr/mint
  buyToken: string;                             // native symbol or token addr/mint
  blockchain: "sol" | "eth" | "base" | "zora";
  amount: number;                             // human units (e.g., 2.0 SOL / ETH)
  dryRun?: boolean;
  slippageBps?: number;                       // default from env (e.g., 100 bps)
  priorityFee?: number;                       // lamports (Sol) or ignored for 0x
};

export type CadenceTraderResponse =
  | {
      success: true;
      chain: string;
      transactionSignature?: string;          // Solana signature
      estOut?: number;                        // Solana convenience field
      quote?: unknown;                        // raw aggregator quote
      result?: unknown;                       // EVM transaction (tx) receipt / simulation
    }
  | {
      success: false;
      error: string;
      issues?: Array<{ path: string; message: string }>;
    };
