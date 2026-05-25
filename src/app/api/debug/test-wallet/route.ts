/**
 * Test Pi Wallet Configuration
 * GET /api/debug/test-wallet
 *
 * Tests wallet setup and validates configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { validatePiWalletConfig, getPiWalletConfig, getWalletBalance } from '@/lib/pi-wallet';

export async function GET(request: NextRequest) {
  try {
    // Validate wallet configuration
    const validation = validatePiWalletConfig();

    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: validation.error,
        configuration: {
          PI_WALLET_ADDRESS: process.env.PI_WALLET_ADDRESS ? 'Set' : 'Not set',
          PI_WALLET_PRIVATE_KEY: process.env.PI_WALLET_PRIVATE_KEY ? 'Set' : 'Not set',
          PI_WALLET_SEED: process.env.PI_WALLET_SEED ? 'Set' : 'Not set',
          PI_API_URL: process.env.PI_API_URL || 'Not set',
          PI_API_KEY: process.env.PI_API_KEY ? 'Set' : 'Not set'
        }
      }, { status: 400 });
    }

    // Get wallet configuration (safe data only)
    const config = getPiWalletConfig();

    // Get wallet balance (placeholder)
    const balance = await getWalletBalance();

    return NextResponse.json({
      success: true,
      wallet: {
        address: validation.address,
        network: validation.network,
        balance: balance.toFixed(7) + ' Pi',
        hasCredentials: validation.hasCredentials
      },
      configuration: {
        PI_WALLET_ADDRESS: 'Set ✓',
        PI_WALLET_PRIVATE_KEY: process.env.PI_WALLET_PRIVATE_KEY ? 'Set ✓' : 'Not set',
        PI_WALLET_SEED: process.env.PI_WALLET_SEED ? 'Set ✓' : 'Not set',
        PI_API_URL: process.env.PI_API_URL || 'Not set',
        PI_API_KEY: process.env.PI_API_KEY ? 'Set ✓' : 'Not set',
        environment: process.env.NODE_ENV || 'development'
      },
      nextSteps: [
        '✅ Wallet configuration is valid',
        '📝 Ensure wallet has sufficient Pi balance',
        '🔄 Test A2U payment with Test Pi claim feature',
        '🚀 Ready for production deployment'
      ],
      warnings: validation.network === 'mainnet' ? [
        '⚠️ You are using MAINNET - ensure you have sufficient Pi balance',
        '⚠️ All transactions will use real Pi funds'
      ] : [
        'ℹ️ You are using TESTNET - transactions use test Pi'
      ]
    });

  } catch (error) {
    console.error('Wallet test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test wallet configuration',
      configuration: {
        error: 'Wallet configuration test failed'
      }
    }, { status: 500 });
  }
}