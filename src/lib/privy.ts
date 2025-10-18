/**
 * Privy Wallet Management Service
 * 
 * This service handles wallet creation and management using Privy's server SDK.
 * It allows the application to create and manage wallets on behalf of users.
 */

import { PrivyClient } from '@privy-io/node';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getConnection } from './wallet.ts';

export interface PrivyWallet {
  id: string;
  address: string;
  publicKey: PublicKey;
  createdAt: string;
  userId?: string;
}

export class PrivyWalletService {
  private privy: PrivyClient;
  private connection: Connection;

  constructor() {
    const appId = process.env.PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;
    const authKey = process.env.PRIVY_AUTHORIZATION_KEY;

    if (!appId || !appSecret) {
      throw new Error('PRIVY_APP_ID and PRIVY_APP_SECRET environment variables are required');
    }

    if (!authKey) {
      throw new Error('PRIVY_AUTHORIZATION_KEY environment variable is required for server-side wallet creation');
    }

    // Initialize Privy client for server-side wallet creation
    this.privy = new PrivyClient({
      appId: appId,
      appSecret: appSecret,
    });
    this.connection = getConnection();
  }

  /**
   * Create a new embedded wallet for a user using Privy Server SDK
   * @param userId - Optional user identifier
   * @returns Promise<PrivyWallet>
   */
  async createWallet(userId?: string): Promise<PrivyWallet> {
    try {
      console.log('Creating wallet using Privy Node.js SDK...');
      
      // Use the official Privy Node.js SDK method
      const wallet = await this.privy.wallets().create({
        chain_type: 'solana'
        // Note: For server-side wallets, owner is typically not specified
        // The wallet will be owned by the authorization key automatically
      });

      // Convert the Privy wallet response to our interface
      const publicKey = new PublicKey(wallet.address);
      
      return {
        id: wallet.id,
        address: wallet.address,
        publicKey: publicKey,
        createdAt: new Date(wallet.created_at * 1000).toISOString(), // Convert timestamp to ISO string
        userId: userId || undefined,
      };
    } catch (error) {
      console.error('Error creating Privy wallet:', error);
      throw new Error(`Failed to create wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
