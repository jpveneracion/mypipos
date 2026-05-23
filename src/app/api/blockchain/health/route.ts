/**
 * Blockchain API Health Check Endpoint
 * GET /api/blockchain/health
 *
 * Checks the health of blockchain explorer connectivity
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Use the testnet URL for health check
    const explorerUrl = 'https://blockexplorer.minepi.com/testnet/api';

    // Try to reach the blockchain explorer
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `${explorerUrl}?module=block&action=getblockcount`,
      {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    clearTimeout(timeoutId);

    const isHealthy = response.ok;

    return NextResponse.json({
      success: true,
      healthy: isHealthy,
      explorer: explorerUrl,
      timestamp: new Date().toISOString(),
      status: isHealthy ? 'operational' : 'degraded',
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        status: 'down',
      },
      { status: 503 }
    );
  }
}
