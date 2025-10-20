/**
 * Referral & fee accrual service:
 * - resolve a user by wallet (evm/sol)
 * - insert swap_event
 * - if within referral window, insert referral_earning
 * - bump invite_attribution.total_swaps and set first_swap_at
 */
import { getSupabase } from "../../lib/supabase.ts";

type ChainKey = "sol" | "eth" | "base" | "zora";
type WalletKind = "evm" | "sol";

export type RecordSwapInput = {
  chain: ChainKey;
  userWallet: string;           // 0x... for EVM or base58 for Sol
  walletKind: WalletKind;       // "evm" | "sol"
  txHash: string;               // tx or sig
  sellToken: string;            // address/"ETH"/"SOL"
  buyToken: string;             // address/mint
  buyAmountAtomic: string;      // integer string
  buyTokenDecimals: number;     // decimals for buyToken
  sellAmountAtomic?: string;    // optional integer string (good to have)
  quote?: unknown;              // trimmed aggregator response for audit
};

function envInt(name: string, fallback: number) {
  const v = Number(process.env[name]);
  return Number.isFinite(v) ? v : fallback;
}

function daysFromEnv(): number {
  return envInt("REFERRAL_DURATION_DAYS", 60);
}

function platformFeeBps(): number {
  return envInt("PLATFORM_FEE_BPS", 200); // 2% default example
}
function referralSharePercent(): number {
  return envInt("REFERRAL_FEE_SHARE_PERCENT", 50); // 50% by default
}

/** Resolve app_user.id by wallet (fails if not found). */
async function resolveUserIdByWallet(kind: WalletKind, wallet: string): Promise<string> {
  const sb = getSupabase();
  if (kind === "evm") {
    const { data, error } = await sb
      .from("app_user")
      .select("id")
      .eq("wallet_evm", wallet.toLowerCase())
      .maybeSingle();
    if (error || !data?.id) throw new Error("user not found for EVM wallet");
    return data.id;
  }
  // SOL
  const { data, error } = await sb
    .from("app_user")
    .select("id")
    .eq("wallet_sol", wallet)
    .maybeSingle();
  if (error || !data?.id) throw new Error("user not found for Sol wallet");
  return data.id;
}

/** Is invitee still within the referral window? Return inviter or null if not eligible. */
async function eligibleInviter(inviteeId: string): Promise<string | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("invite_attribution")
    .select("inviter_user_id, attributed_at")
    .eq("invitee_user_id", inviteeId)
    .maybeSingle();
  if (error || !data) return null;

  const days = daysFromEnv();
  const attributedAt = new Date(data.attributed_at);
  const expiresAt = new Date(attributedAt.getTime() + days * 24 * 60 * 60 * 1000);
  return new Date() <= expiresAt ? (data.inviter_user_id as string) : null;
}

/** Insert or update small attribution counters (first_swap_at, total_swaps). */
async function bumpAttributionCounters(inviteeId: string) {
  const sb = getSupabase();
  // fetch current
  const { data: row } = await sb
    .from("invite_attribution")
    .select("first_swap_at, total_swaps")
    .eq("invitee_user_id", inviteeId)
    .maybeSingle();

  if (!row) return; // no attribution, nothing to bump

  const firstSwapAt = row.first_swap_at ?? new Date().toISOString();
  const totalSwaps = (row.total_swaps ?? 0) + 1;

  await sb
    .from("invite_attribution")
    .update({ first_swap_at: firstSwapAt, total_swaps: totalSwaps })
    .eq("invitee_user_id", inviteeId);
}

/**
 * Core entrypoint: record a swap and (if eligible) create a referral earning.
 * Returns the new swap_event id and (optionally) a referral_earning id.
 */
export async function recordSwapAndReferral(input: RecordSwapInput): Promise<{
  swapEventId: string;
  referralEarningId?: string;
}> {
  const sb = getSupabase();
  const {
    chain, userWallet, walletKind, txHash,
    sellToken, buyToken, buyAmountAtomic, buyTokenDecimals,
    sellAmountAtomic, quote
  } = input;

  const userId = await resolveUserIdByWallet(walletKind, userWallet);

  // platform fee in buy-token units
  const pfBps = platformFeeBps();
  const buyAtomic = BigInt(buyAmountAtomic);
  const platformFeeAtomic = (buyAtomic * BigInt(pfBps)) / BigInt(10_000);

  // 1) insert swap_event
  const { data: swapIns, error: swapErr } = await sb
    .from("swap_event")
    .insert({
      user_id: userId,
      chain,
      tx_hash: txHash,
      sell_token: sellToken,
      buy_token: buyToken,
      sell_amount_atomic: sellAmountAtomic ?? null,
      buy_amount_atomic: buyAmountAtomic,
      buy_token_decimals: buyTokenDecimals,
      notional_usd: null, // optional later
      quote: quote ?? null,
      platform_fee_bps: pfBps,
      platform_fee_atomic: platformFeeAtomic.toString(),
    })
    .select("id")
    .single();

  if (swapErr || !swapIns?.id) throw new Error(swapErr?.message || "failed to insert swap_event");

  // 2) referral eligibility
  const inviterId = await eligibleInviter(userId);
  if (!inviterId || platformFeeAtomic <= 0n) {
    await bumpAttributionCounters(userId);
    return { swapEventId: swapIns.id };
  }

  // 3) create referral_earning
  const sharePct = referralSharePercent();
  const refAmount = (platformFeeAtomic * BigInt(sharePct)) / BigInt(100);

  const { data: earnIns, error: earnErr } = await sb
    .from("referral_earning")
    .insert({
      referrer_user_id: inviterId,
      invitee_user_id: userId,
      swap_event_id: swapIns.id,
      share_percent: sharePct,
      amount_atomic: refAmount.toString(),
      token_address: buyToken,
      status: "accrued",
    })
    .select("id")
    .single();

  if (earnErr) throw new Error(earnErr.message);

  await bumpAttributionCounters(userId);
  return { swapEventId: swapIns.id, referralEarningId: earnIns?.id };
}
