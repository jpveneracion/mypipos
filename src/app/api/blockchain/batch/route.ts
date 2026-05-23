/**
 * Batch Transaction Lookup Endpoint
 * POST /api/blockchain/batch
 *
 * Look up multiple transactions in a single request
 * Reduces API calls and improves performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBatchTransactions } from '@/lib/blockchain';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    if (!body.txids || !Array.isArray(body.txids)) {
      return NextResponse.json(
        {
          success: false,
          error: 'txids array is required',
        },
        { status: 400 }
      );
    }

    const txids = body.txids;

    // Validate TXID count (prevent abuse)
    if (txids.length > 50) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maximum 50 transactions per batch request',
        },
        { status: 400 }
      );
    }

    // Validate each TXID
    for (const txid of txids) {
      if (!txid || typeof txid !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: 'All TXIDs must be strings',
          },
          { status: 400 }
        );
      }
    }

    // Fetch all transactions
    const results = await getBatchTransactions(txids);

    // Convert Map to object for JSON serialization
    const resultsObj: Record<string, any> = {};
    let successCount = 0;
    let failureCount = 0;

    for (const [txid, result] of results.entries()) {
      resultsObj[txid] = result;
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    return NextResponse.json({
      success: true,
      results: resultsObj,
      summary: {
        total: txids.length,
        successful: successCount,
        failed: failureCount,
      },
    });

  } catch (error) {
    console.error('Batch transaction lookup error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred while processing the batch request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
