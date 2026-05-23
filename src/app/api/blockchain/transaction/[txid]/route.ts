/**
 * Transaction Lookup API Endpoint
 * GET /api/blockchain/transaction/[txid]
 *
 * Looks up Pi Network blockchain transactions by transaction ID
 * Uses caching to reduce blockchain explorer API calls
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getTransaction,
  verifyTransaction,
  InvalidTransactionError,
  TransactionNotFoundError,
  NetworkError,
  BlockchainError,
} from '@/lib/blockchain';

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { txid: string } }
) {
  try {
    const txid = params.txid;

    // Validate TXID parameter
    if (!txid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transaction ID is required',
        },
        { status: 400 }
      );
    }

    // Check for verification parameters
    const searchParams = request.nextUrl.searchParams;
    const expectedAmount = searchParams.get('amount');
    const recipientAddress = searchParams.get('recipient');

    // If verification parameters are provided, verify the transaction
    if (expectedAmount !== null) {
      const amount = parseFloat(expectedAmount);
      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid amount parameter',
          },
          { status: 400 }
        );
      }

      const verificationResult = await verifyTransaction(
        txid,
        amount,
        recipientAddress || undefined
      );

      if (!verificationResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: verificationResult.error,
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        verified: verificationResult.verified,
        transaction: verificationResult.transaction,
        ...(verificationResult.error && { error: verificationResult.error }),
      });
    }

    // Regular transaction lookup
    const result = await getTransaction(txid);

    if (!result.success) {
      // Determine appropriate status code based on error
      let statusCode = 500;

      if (result.error?.includes('not found')) {
        statusCode = 404;
      } else if (result.error?.includes('Invalid TXID')) {
        statusCode = 400;
      } else if (result.error?.includes('Rate limit')) {
        statusCode = 429;
      }

      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      transaction: result.transaction,
      cached: result.cached,
    });

  } catch (error) {
    console.error('Transaction lookup error:', error);

    // Handle specific error types
    if (error instanceof InvalidTransactionError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    if (error instanceof TransactionNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 404 }
      );
    }

    if (error instanceof NetworkError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Blockchain explorer is currently unavailable',
          details: error.message,
        },
        { status: 503 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred while looking up the transaction',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Optional: HEAD method for caching checks
// ============================================================================

export async function HEAD(
  request: NextRequest,
  { params }: { params: { txid: string } }
) {
  try {
    const txid = params.txid;

    if (!txid) {
      return new NextResponse(null, { status: 400 });
    }

    const result = await getTransaction(txid);

    if (!result.success || !result.transaction) {
      return new NextResponse(null, { status: 404 });
    }

    // Return headers only
    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Transaction-Status': result.transaction.status,
        'X-Transaction-Amount': result.transaction.amount.toString(),
        'X-Cached': result.cached ? 'true' : 'false',
      },
    });

  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}

// ============================================================================
// Edge Runtime Configuration
// ============================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
