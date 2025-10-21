/**
 * zod schema for POST /api/algo/cadence-trader
 * - Back-compat: accepts legacy fields (public_wallet, priorityFee)
 * - Privy-first: supports userId for server-side signing via Privy
 * - Normalizes to a single shape handlers can rely on
 */
import { z, type ZodError } from "zod";

// Very light heuristics for tokens: native, EVM address, or Solana base58 mint
const tokenLike = z
  .string()
  .trim()
  .min(1)
  .refine((v: string) => {
    const upper = v.toUpperCase();
    if (upper === "SOL" || upper === "ETH") return true;                 // native
    if (v.startsWith("0x") && v.length === 42) return true;              // EVM address
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v)) return true;            // Solana base58 (rough)
    return false;
  }, { message: "Expected native symbol (SOL/ETH), EVM 0x-address, or Solana base58 mint" });

export const CadenceTraderSchema = z.object({
  // Privy-first
  userId: z.string().trim().min(1).optional(),

  // Legacy / convenience (normalize to publicWallet)
  publicWallet: z.string().trim().min(32).optional(),
  public_wallet: z.string().trim().min(32).optional(),

  blockchain: z.enum(["sol", "eth", "base", "zora"]),
  sellToken: tokenLike,
  buyToken: tokenLike,
  amount: z.number().positive("amount must be > 0"),

  // Slippage & fees
  slippageBps: z.number().int().min(1).max(10_000).optional(),
  priorityFeeMicrolamports: z.number().int().nonnegative().optional(), // new canonical
  priorityFee: z.number().int().nonnegative().optional(),              // legacy alias

  // Misc
  idempotencyKey: z.string().trim().min(1).optional(),
  simulate: z.boolean().optional(),
  dryRun: z.boolean().optional(),
})
.transform((raw) => {
  // normalize legacy fields → canonical names
  const publicWallet = raw.publicWallet ?? raw.public_wallet ?? undefined;
  const priorityFeeMicrolamports = raw.priorityFeeMicrolamports ?? raw.priorityFee ?? 0;

  return {
    ...raw,
    publicWallet,
    priorityFeeMicrolamports,
  };
})
.refine(
  (v) => !!v.userId || !!v.publicWallet,
  { message: "Provide either userId (Privy) or publicWallet.", path: ["userId"] }
)
.refine(
  (v) => v.sellToken.toLowerCase() !== v.buyToken.toLowerCase(),
  { message: "sellToken and buyToken must be different", path: ["buyToken"] }
);

// Inferred, fully normalized payload type (source of truth)
export type CadenceTraderPayload = z.infer<typeof CadenceTraderSchema>;

// Small helper for client-friendly error formatting
export function formatZodError(err: ZodError) {
  return err.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
  }));
}
