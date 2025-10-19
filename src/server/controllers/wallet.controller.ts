import { Request, Response } from "express";
import { createWallet, getWallet } from "../../lib/wallet.js";

/**
 * Creates a new wallet for the specified blockchain chain type
 * @param req - Express request object containing chainType in body (defaults to "solana")
 * @param res - Express response object
 * @returns JSON response with wallet details or error message
 */
export const createWalletHandler = async (req: Request, res: Response) => {
  try {
    const {  chainType = "solana" } = req.body;

    // Create wallet using Privy authorization key
    const wallet = await createWallet(chainType as "ethereum" | "solana");

    return res.json({
      success: true,
      wallet: {
        id: wallet.id,
        address: wallet.address,
        chainType: wallet.chain_type,
        createdAt: wallet.created_at,
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
 * Retrieves wallet information by wallet ID
 * @param req - Express request object containing walletId in params
 * @param res - Express response object
 * @returns JSON response with wallet details or error message
 */
export const getWalletHandler = async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;

    if (!walletId) {
      return res.status(400).json({ 
        success: false, 
        error: "walletId is required" 
      });
    }

    const wallet = await getWallet(walletId);

    return res.json({
      success: true,
      wallet: {
        id: wallet.id,
        address: wallet.address,
        chainType: wallet.chain_type,
        createdAt: wallet.created_at,
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
