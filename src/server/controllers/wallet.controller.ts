import { Request, Response } from "express";
import { privyWalletService } from "../../lib/privy.ts";

/**
 * Create a new wallet and return the address
 * POST /api/wallets
 */
export const createWallet = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    
    const wallet = await privyWalletService().createWallet(userId);
    
    return res.json({
      success: true,
      wallet: {
        id: wallet.id,
        address: wallet.address,
        publicKey: wallet.publicKey.toString(),
        createdAt: wallet.createdAt,
        userId: wallet.userId
      }
    });
  } catch (error: any) {
    console.error('Error creating wallet:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create wallet',
    });
  }
};

