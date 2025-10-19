/**
 * zod schema for POST /api/algo/cadence-trader
 * - Validates required fields
 * - Light formatting checks for addresses/symbols
 */
import { z, type ZodError} from "zod";

// Very light heuristics for tokens: allow native symbols, 0x-addresses, or Solana base58 mints
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
  public_wallet: z.string().trim().min(4, "public_wallet required"),
  sellToken: tokenLike,
  buyToken: tokenLike,
  blockchain: z.enum(["sol", "eth", "base", "zora"]),
  amount: z.number().positive("amount must be > 0"),
  dryRun: z.boolean().optional(),
  slippageBps: z.number().int().min(1).max(5000).optional(),
  priorityFee: z.number().nonnegative().optional(),
}).refine(
  (data) => data.sellToken.toLowerCase() !== data.buyToken.toLowerCase(),
  {
    message: "sellToken and buToken must be different",
    path: ["buyToken"], // This will attach the error to the buyToken field
  }
);

// export types to frontend for autocomplete
export type CadenceTraderInput = z.infer<typeof CadenceTraderSchema>;

// Format zod issues into a small, client-friendly array 
export function formatZodError(err: ZodError) {
  type Issue = (typeof err.issues)[number]; // infer the element type from the value
  return err.issues.map((i: Issue) => ({
    path: i.path.join("."),
    message: i.message,
  }));
}