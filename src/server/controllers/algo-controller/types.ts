import type { CadenceTraderRequest } from "../../../lib/shared/types.ts";

/** Exact chain literals */
export type ChainKey = "sol" | "eth" | "base" | "zora";

/** Narrowed inputs for each handler, derived from your shared request type */
type Common = Omit<CadenceTraderRequest, "blockchain">;

export type InputSol = Common & { blockchain: "sol" };
export type InputEvm = Common & { blockchain: "eth" | "base" | "zora" };
