import { Request, Response } from "express";
import { Keypair, PublicKey } from "@solana/web3.js";
import { createWallet } from "../../lib/supabase.ts";
import { generateToken } from '../../lib/auth.js';

export const login = async (req: Request, res: Response) => {
  try {
    const { userId, email } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Generate JWT token
    const token = generateToken(userId, email);
    
    res.json({
      success: true,
      token,
      userId,
      email
    });
  } catch (error) {
    console.error('❌ Error generating token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate token'
    });
  }
};

export const postCreateWallet = async (req: Request, res: Response) => {
  try {
    // Generate a new keypair
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    const secretKey = Array.from(keypair.secretKey);

    // Store the wallet in the database
    const walletAddress = await createWallet(secretKey, publicKey);

    return res.json({
      success: true,
      walletAddress: walletAddress,
      message: "Wallet created successfully"
    });
  } catch (e: any) {
    return res.status(400).json({ 
      success: false, 
      error: e?.message || String(e) 
    });
  }
};

export const getWalletInfo = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false, 
        error: "Wallet address is required" 
      });
    }

    // Validate the wallet address format
    try {
      new PublicKey(walletAddress);
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid wallet address format" 
      });
    }

    // Check if wallet exists (without exposing the secret key)
    const { walletSecretExists } = await import("../../lib/wallet.ts");
    const exists = await walletSecretExists(walletAddress);

    if (!exists) {
      return res.status(404).json({ 
        success: false, 
        error: "Wallet not found" 
      });
    }

    return res.json({
      success: true,
      walletAddress: walletAddress,
      exists: true
    });
  } catch (e: any) {
    return res.status(400).json({ 
      success: false, 
      error: e?.message || String(e) 
    });
  }
};
