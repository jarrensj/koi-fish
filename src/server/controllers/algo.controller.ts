
// // (If you enabled path aliases, you can use @lib/shared/chains, @lib/sol/*, @lib/evm/* instead.)

// /**
//  * Controller for POST /api/algo/cadence-trader
//  * - Validates payload with zod (shared/validation)
//  * - Routes to Solana (Jupiter) or EVM (0x) based on `blockchain`
//  */
// import type { Request, Response } from "express";
// import { CHAINS, type ChainKey, isNativeSymbol } from "../../lib/shared/chains.ts";
// import { CadenceTraderSchema, formatZodError } from "../../lib/shared/validation.ts";

// // Solana stack
// import { getConnection, loadKeypair } from "../../lib/solana/solWallet.ts";
// import { buyWithSol } from "../../lib/solana/jupiter.ts";

// // EVM stack
// import { loadEvmWalletFromEnv /* loadEvmWalletFromDatabase */ } from "../../lib/evm/evmWallet.ts";
// import { get0xQuote, displayToOnChain, ensureAllowance, send0xSwap, type OxQuote, buildSwapPreview  } from "../../lib/evm/evm0x.ts";

// /**
//  * POST /api/algo/cadence-trader
//  * Body: { public_wallet, sellToken, buyToken, blockchain, amount, dryRun?, slippageBps?, priorityFee? }
//  */
// export async function postCadenceTrader(req: Request, res: Response) {
//   try {
//     // 1) Validate input
//     const parsed = CadenceTraderSchema.safeParse(req.body);
//     if (!parsed.success) {
//       return res
//         .status(400)
//         .json({ success: false, error: "Invalid payload", issues: formatZodError(parsed.error) });
//     }

//     const {
//       public_wallet,
//       sellToken,
//       buyToken,
//       blockchain,
//       amount,
//       dryRun = false,
//       slippageBps = Number(process.env.SLIPPAGE_BPS || 100),
//       priorityFee = 0,
//     } = parsed.data;

//     const chain = String(blockchain).toLowerCase() as ChainKey;
//     if (!CHAINS[chain]) {
//       return res.status(400).json({ success: false, error: `Unsupported chain: ${blockchain}` });
//     }

//     // 2) Solana path (v1 supports SOL -> token only)
//     if (chain === "sol") {
//       if (!isNativeSymbol("sol", sellToken)) {
//         return res
//           .status(400)
//           .json({ success: false, error: "For Solana v1, sellToken must be SOL (SOL→token only)" });
//       }

//       const conn = getConnection();
//       // TODO: switch to DB-backed loader when secrets are wired:
//       // const wallet = await loadKeypairFromDatabase(public_wallet);
//       const wallet = loadKeypair();

//       const { sig, quote } = await buyWithSol(
//         conn,
//         wallet,
//         buyToken,
//         Number(amount),
//         slippageBps,
//         Number(priorityFee)
//       );

//       const outDecimals =
//         typeof quote.outputMintDecimals === "number" ? quote.outputMintDecimals : 6;
//       const estOut = Number(quote.outAmount) / 10 ** outDecimals;

//       return res.json({ success: true, chain, tx: sig, estOut, quote });
//     }
    
//     // 3) EVM path (eth | base | zora) via 0x
//     // Use env-based wallet for dev; replace with DB-backed when ready
//     const evmWallet = loadEvmWalletFromEnv(chain);
//     const sellTokenParam = isNativeSymbol(chain, sellToken) ? "ETH" : sellToken;
//     const buyTokenParam = isNativeSymbol(chain, sellToken) ? "ETH" : buyToken;

//     // Convert human amount -> atomic based on sell token decimals
//     const { onChain: sellAmountOnChain } = await displayToOnChain({
//       wallet: evmWallet,
//       chain,
//       token: sellTokenParam ? CHAINS[chain].nativeSymbol : sellToken,
//       amount: Number(amount),
//     });

//     // Get 0x quote
//     const quote: OxQuote = await get0xQuote({
//       chain,
//       sellToken: sellTokenParam,
//       buyToken: buyTokenParam,
//       sellAmountOnChain: sellAmountOnChain.toString(),
//       taker: await evmWallet.getAddress(),
//       slippageBps,
//     });

//     // If selling ERC-20, make sure allowance is set
//     if (!sellTokenParam && quote.allowanceTarget) {
//       await ensureAllowance({
//         wallet: evmWallet,
//         token: sellToken,
//         spender: quote.allowanceTarget,
//         amountOnChain: BigInt(quote.sellAmount ?? sellAmountOnChain.toString()),
//       });
//     }
    
//     const preview = await buildSwapPreview({
//     provider: evmWallet.provider,
//     quote,
//     sellToken: sellTokenParam,
//     buyToken: buyTokenParam,
//     });

//     // Send (or simulate) the swap tx
//     const sent = await send0xSwap({ wallet: evmWallet, quote, dryRun });

//     return res.json({ 
//         success: true, 
//         chain, 
//         result: sent, // (simulated or real send summary)
//         quote, // raw (optional to keep)
//         preview // 👈 human-friendly summary like Jupiter’s estOut
//      });
//   } catch (e: any) {
//     return res.status(400).json({ success: false, error: e?.message || String(e) });
//   }
// }
