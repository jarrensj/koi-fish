/**
 * EVM cadence handler: ETH/Base/Zora via 0x (ExactIn).
 * - Ensures allowance if selling ERC-20
 */
import { CHAINS, isNativeSymbol } from "../../../lib/shared/chains.ts";
import { loadEvmWalletFromEnv /* loadEvmWalletFromDatabase */ } from "../../../lib/evm/evmWallet.ts";
import { OxQuote, get0xQuote, displayToOnChain, ensureAllowance, send0xSwap,  } from "../../../lib/evm/evm0x.ts";
import type { InputEvm } from "./types.ts";

export async function handleEvm(input: InputEvm) {
  const {
    sellToken,
    buyToken,
    blockchain,
    amount,
    slippageBps = Number(process.env.SLIPPAGE_BPS || 100),
  } = input;

  const chain = blockchain; // "eth" | "base" | "zora"
  const evmWallet = loadEvmWalletFromEnv(chain); // swap to DB-backed later if desired

  const sellTokenParam = isNativeSymbol(chain, sellToken) ? "ETH" : sellToken;
  const buyTokenParam  = isNativeSymbol(chain, buyToken)   ? "ETH" : buyToken;

  const { onChain: sellAmountOnChain } = await displayToOnChain({
    wallet: evmWallet,
    chain,
    token: sellTokenParam,
    amount: Number(amount),
  });

  const quote: OxQuote = await get0xQuote({
    chain,
    sellToken: sellTokenParam,
    buyToken: buyTokenParam,
    sellAmountOnChain: sellAmountOnChain.toString(),
    taker: await evmWallet.getAddress(),
    slippageBps,
  });

  // Approve if selling ERC-20
  const sellingNative = sellTokenParam.toUpperCase() === "ETH";
  if (!sellingNative && quote.allowanceTarget) {
    await ensureAllowance({
      wallet: evmWallet,
      token: sellTokenParam,
      spender: quote.allowanceTarget,
      amountOnChain: BigInt(quote.sellAmount ?? sellAmountOnChain.toString()),
    });
  }

  const sent = await send0xSwap({ wallet: evmWallet, quote });
  return { success: true as const, chain, result: sent, quote };
}