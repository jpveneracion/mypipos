/**
 * Pi Network Wallet Utilities
 * Handles wallet operations for A2U payments and platform transactions
 */

import { query } from './db';

export interface PiWalletConfig {
  address: string;
  privateKey?: string;
  seedPhrase?: string;
  network: 'testnet' | 'mainnet';
}

export interface WalletValidationResult {
  valid: boolean;
  address?: string;
  network?: string;
  hasCredentials: boolean;
  error?: string;
}

/**
 * Get Pi wallet configuration from environment variables
 */
export function getPiWalletConfig(): PiWalletConfig {
  const address = process.env.PI_WALLET_ADDRESS;
  const privateKey = process.env.PI_WALLET_PRIVATE_KEY;
  const seedPhrase = process.env.PI_WALLET_SEED;
  const apiUrl = process.env.PI_API_URL || 'https://api.testnet.minepi.com/v2';

  const network = apiUrl.includes('testnet') ? 'testnet' : 'mainnet';

  if (!address) {
    throw new Error('PI_WALLET_ADDRESS environment variable is not set');
  }

  if (!privateKey && !seedPhrase) {
    throw new Error('Either PI_WALLET_PRIVATE_KEY or PI_WALLET_SEED must be set');
  }

  return {
    address,
    privateKey,
    seedPhrase,
    network
  };
}

/**
 * Validate Pi wallet configuration
 */
export function validatePiWalletConfig(): WalletValidationResult {
  try {
    const config = getPiWalletConfig();

    // Basic address validation (Pi addresses typically start with 'G' or 'H')
    const addressValid = /^[GH][1-9A-HJ-NP-Za-km-z]{50,55}$/.test(config.address);

    if (!addressValid) {
      return {
        valid: false,
        error: 'Invalid wallet address format',
        hasCredentials: false
      };
    }

    return {
      valid: true,
      address: config.address.substring(0, 10) + '...', // Show partial for security
      network: config.network,
      hasCredentials: !!(config.privateKey || config.seedPhrase)
    };

  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      hasCredentials: false
    };
  }
}

/**
 * Create A2U payment using platform wallet
 * This function would integrate with Pi Network SDK for actual blockchain transactions
 */
export async function createA2UPayment(
  toAddress: string,
  amount: number,
  memo: string,
  metadata?: Record<string, any>
) {
  try {
    const config = getPiWalletConfig();

    // TODO: Integrate with Pi Network SDK for actual payment creation
    // This is a placeholder showing the structure

    const paymentData = {
      from: config.address,
      to: toAddress,
      amount: amount.toFixed(7),
      memo,
      metadata,
      network: config.network,
      createdAt: new Date().toISOString()
    };

    // In production, you would:
    // 1. Create payment using Pi Network SDK
    // 2. Sign transaction with private key
    // 3. Submit to blockchain
    // 4. Return transaction ID

    return {
      success: true,
      payment: paymentData,
      message: 'A2U payment created (placeholder - integrate with Pi SDK)'
    };

  } catch (error) {
    console.error('A2U payment creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create A2U payment'
    };
  }
}

/**
 * Get wallet balance (placeholder for Pi Network SDK integration)
 */
export async function getWalletBalance(): Promise<number> {
  try {
    const config = getPiWalletConfig();

    // TODO: Integrate with Pi Network SDK to get actual balance
    // const balance = await Pi.getBalance(config.address);

    return 0; // Placeholder

  } catch (error) {
    console.error('Failed to get wallet balance:', error);
    return 0;
  }
}

/**
 * Validate wallet has sufficient balance for A2U payment
 */
export async function validateSufficientBalance(amount: number): Promise<boolean> {
  const balance = await getWalletBalance();
  return balance >= amount;
}

/**
 * Format wallet address for display (show partial with asterisks)
 */
export function formatWalletAddress(address: string, showChars = 6): string {
  if (!address || address.length < showChars * 2) {
    return '***';
  }
  return `${address.substring(0, showChars)}...${address.substring(address.length - showChars)}`;
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: string): string {
  if (!data || data.length < 8) {
    return '***';
  }
  return `${data.substring(0, 4)}${'*'.repeat(data.length - 8)}${data.substring(data.length - 4)}`;
}