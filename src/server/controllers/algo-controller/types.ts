/**
 * Handler input types derived from the normalized request type,
 * with a branded (optional) userId for Privy.
 */
import type { CadenceTraderRequest, PrivyUserId } from "../../../lib/shared/types.ts";

// Common fields from the normalized payload, minus the chain discriminator
type Common = Omit<CadenceTraderRequest, "blockchain">;

// Re-brand userId to PrivyUserId while keeping it optional
type CommonBranded = Omit<Common, "userId"> & { userId?: PrivyUserId };

export type InputSol = CommonBranded & { blockchain: "sol" };
export type InputEvm = CommonBranded & { blockchain: "eth" | "base" | "zora" };
