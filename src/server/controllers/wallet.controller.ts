import { Request, Response } from "express";
import { getPrivyClient, getPrivyWallet, getUserPrivyWallets, createPrivyWalletWithAuthKey } from "../../lib/wallet.js";

export const createWallet = async (req: Request, res: Response) => {
  try {
    const { userId, chainType = "solana" } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: "userId is required" 
      });
    }

    // Ensure userId has the correct Privy format
    const privyUserId = userId.startsWith('did:privy:') ? userId : `did:privy:${userId}`;

    // Create wallet for the user
    const privy = getPrivyClient();
    const wallet = await privy.wallets().create({
      chain_type: chainType as "ethereum" | "solana",
      owner: { user_id: privyUserId },
    });

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

export const getWallet = async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;

    if (!walletId) {
      return res.status(400).json({ 
        success: false, 
        error: "walletId is required" 
      });
    }

    const wallet = await getPrivyWallet(walletId);

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

export const getUserWallets = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: "userId is required" 
      });
    }

    const walletsPage = await getUserPrivyWallets(userId);
    const wallets = walletsPage.data;

    return res.json({
      success: true,
      wallets: wallets.map(wallet => ({
        id: wallet.id,
        address: wallet.address,
        chainType: wallet.chain_type,
        createdAt: wallet.created_at,
      })),
    });
  } catch (error: any) {
    console.error("Error getting user wallets:", error);
    return res.status(500).json({ 
      success: false, 
      error: error?.message || "Failed to get user wallets" 
    });
  }
};

export const createWalletWithAuthKey = async (req: Request, res: Response) => {
  try {
    const { authKey, chainType = "solana" } = req.body;

    if (!authKey) {
      return res.status(400).json({ 
        success: false, 
        error: "authKey is required" 
      });
    }

    const wallet = await createPrivyWalletWithAuthKey(authKey, chainType as "ethereum" | "solana");

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
    console.error("Error creating wallet with auth key:", error);
    return res.status(500).json({ 
      success: false, 
      error: error?.message || "Failed to create wallet with auth key" 
    });
  }
};
