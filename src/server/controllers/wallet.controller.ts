import { Request, Response } from "express";
import { createEmbeddedWallet, getEmbeddedWallet } from "../../lib/privy/privyCreateWallet.ts";


/**
 * Creates a new wallet for the specified blockchain chain type
 * @param req - Express request object containing chainType in body { chain?: "sol" | "eth" | "base" | "zora" }  (defaults to "sol")
 * @param res - Express response object
 * @returns JSON response with wallet details or error message
 */
export const createWalletHandler = async (req: Request, res: Response) => {
  try {
    const { chain = "sol" } = req.body as { chain?: "sol" | "eth" | "base" | "zora" };
    
    if (!["sol", "eth", "base", "zora"].includes(chain)) {
      return res.status(400).json({ success: false, error: "Invalid chain" });
    }

    // Create wallet using Privy authorization key
    const wallet = await  createEmbeddedWallet(chain);

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
 *  Get embedded wallet by id (Privy walletId)
 * @param req - Express request object containing walletId in params
 * @param res - Express response object
 * @returns JSON response with wallet details or error message
 */
export const getWalletHandler = async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params as { walletId?: string };

    if (!walletId) {
      return res.status(400).json({ 
        success: false, 
        error: "walletId is required" 
      });
    }

    const wallet = await getEmbeddedWallet(walletId);

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
      error: error?.message || "Failed to get wallet" 
    });
  }
};
