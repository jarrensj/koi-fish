/**
 * Privy Wallet Management Service
 * 
 * This service handles wallet creation and management using Privy's server SDK.
 * It allows the application to create and manage wallets on behalf of users.
 */

import { PrivyClient as PrivyServerClient } from '@privy-io/server-auth';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getConnection } from './wallet.js';

export interface PrivyWallet {
  id: string;
  address: string;
  publicKey: PublicKey;
  createdAt: string;
  userId?: string;
}

export class PrivyWalletService {
  private privy: PrivyServerClient;
  private connection: Connection;

  constructor() {
    const appId = process.env.PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error('PRIVY_APP_ID and PRIVY_APP_SECRET environment variables are required');
    }

    this.privy = new PrivyServerClient(appId, appSecret);
    this.connection = getConnection();
  }

  /**
   * Create a new embedded wallet for a user
   * @param userId - Optional user identifier
   * @returns Promise<PrivyWallet>
   */
  async createWallet(userId?: string): Promise<PrivyWallet> {
    try {
      // Note: The Privy server SDK doesn't directly support creating wallets
      // This would typically be done through their REST API or client-side SDK
      // For now, we'll create a mock wallet for demonstration purposes
      
      // Generate a new Solana keypair
      const keypair = Keypair.generate();
      const address = keypair.publicKey.toString();
      const walletId = `privy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        id: walletId,
        address: address,
        publicKey: keypair.publicKey,
        createdAt: new Date().toISOString(),
        userId: userId || undefined,
      };
    } catch (error) {
      console.error('Error creating Privy wallet:', error);
      throw new Error(`Failed to create wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get wallet information by wallet ID
   * @param walletId - The wallet ID to retrieve
   * @returns Promise<PrivyWallet | null>
   */
  async getWallet(walletId: string): Promise<PrivyWallet | null> {
    try {
      // Note: This is a simplified implementation
      // In a real implementation, you would store wallet data in a database
      // and retrieve it using the walletId
      
      // For now, we'll return null to indicate wallet not found
      // This should be replaced with actual database lookup
      console.warn('getWallet not fully implemented - wallet lookup requires database storage');
      return null;
    } catch (error) {
      console.error('Error getting Privy wallet:', error);
      return null;
    }
  }

  /**
   * Get wallet balance in SOL
   * @param walletId - The wallet ID to check balance for
   * @returns Promise<number> - Balance in SOL
   */
  async getWalletBalance(walletId: string): Promise<number> {
    try {
      const wallet = await this.getWallet(walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const balance = await this.connection.getBalance(wallet.publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      throw new Error(`Failed to get wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

}

// Export a function to get the service instance (lazy initialization)
let privyWalletServiceInstance: PrivyWalletService | null = null;

export function getPrivyWalletService(): PrivyWalletService {
  if (!privyWalletServiceInstance) {
    privyWalletServiceInstance = new PrivyWalletService();
  }
  return privyWalletServiceInstance;
}

// For backward compatibility, export the service getter
export const privyWalletService = getPrivyWalletService;
