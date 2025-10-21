import { Request, Response } from "express";
import { CHAINS, type ChainKey } from "../../lib/shared/chains.ts";
import { createUserEmbeddedWallet, getEmbeddedWalletById } from "../../lib/privy/wallets.ts";


/**
 * Creates a new wallet for the specified blockchain chain type
 * @param req - Express request object containing chainType in body { chain?: "sol" | "eth" | "base" | "zora" }  (defaults to "sol")
 * @param res - Express response object
 * @returns JSON response with wallet details or error message
 */
export const createWalletHandler = async (req: Request, res: Response) => {
  try {

    // Ideally derive userId from your auth/session middleware; for now accept body.userId
    const userId = (req.body?.userId as string | undefined)?.trim();
    if (!userId) {
      return res.status(400).json({ success: false, error: "userId is required" });
    }

     // Read raw value; treat it as unknown to validate against CHAINS first.
    const chainRaw: unknown = req.body?.chain ?? "sol";

    // Validate chain name using the central CHAINS registry
    if (typeof chainRaw !== "string" || !(chainRaw in CHAINS)) {
      return res.status(400).json({ success: false, error: "Invalid chain" });
    }

    const chain = chainRaw as ChainKey;

    // Embedded wallet scope: only "sol" and "eth" are supported for now.
    // Return 400 for valid-but-unsupported chains like "base" or "zora".
    if (chain !== "sol" && chain !== "eth") {
      return res.status(400).json({
        success: false,
        error: 'Embedded wallets are supported only for "sol" and "eth".',
      });
    }

    // Create wallet using Privy authorization key
    const wallet = await  createUserEmbeddedWallet(userId,chain);

    return res.json({
      success: true,
      wallet: {
        id: wallet.id,
        address: wallet.address,
        chainType: wallet.chainType,
        createdAt: wallet.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Error creating wallet:", error);
    return res.status(500).json({ 
      success: false, 
      error: error?.message || "Failed to create wallet" 
    });
  }
};

/**
 * Get embedded wallet by Privy walletId (path param)
 * route: GET /api/wallets/:walletId
 */
export const getWalletHandler = async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params as { walletId?: string };
    if (!walletId) {
      return res.status(400).json({ success: false, error: "walletId is required" });
    }

    const wallet = await getEmbeddedWalletById(walletId);

    return res.json({
      success: true,
      wallet: {
        id: wallet.id,
        address: wallet.address,
        chainType: wallet.chainType,
        createdAt: wallet.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Error getting wallet:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to get wallet",
    });
  }
};