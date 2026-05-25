/**
 * A2U (App-to-User) Payment API
 * POST /api/payments/a2u
 *
 * Creates A2U payments from platform to users (refunds, rewards, payouts)
 * Uses Pi Network API with Master API Key to submit payments
 */

import { NextResponse } from 'next/server';
import { processA2UPayment } from '@/lib/a2u-payment';

export async function POST(request: Request) {
  try {
    const { uid, amount, memo, transaction_type, metadata } = await request.json();

    console.log(`[A2U] Creating A2U payment:`, { uid, amount, memo, transaction_type });

    // Validation
    if (!uid || !amount || !memo || !transaction_type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: uid, amount, memo, transaction_type' },
        { status: 400 }
      );
    }

    // Process A2U payment using shared logic
    const result = await processA2UPayment({
      uid,
      amount,
      memo,
      transaction_type,
      metadata
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('[A2U] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}