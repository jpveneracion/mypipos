/**
 * Claim Test Pi - One-time Pioneer Bonus
 * POST /api/customers/claim-test-pi
 *
 * Allows registered pioneers to claim 1 test Pi (one-time only)
 * Uses A2U payment infrastructure - matches mypiroll implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    console.log(`[CLAIM-TEST-PI] Test Pi claim request:`, { userId });

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    // Step 1: Get user details first (needed for wallet address check)
    const userResult = await query(
      `SELECT * FROM users WHERE id = $1`,
      [userId]
    );

    if (!userResult.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    if (!user.pi_wallet_address) {
      return NextResponse.json(
        { success: false, error: 'User does not have a Pi wallet address. Please add it in account settings first.' },
        { status: 400 }
      );
    }

    if (!user.pi_uid) {
      return NextResponse.json(
        { success: false, error: 'User does not have Pi UID. Please authenticate with Pi Network first.' },
        { status: 400 }
      );
    }

    // Step 2: Check if this wallet address has already claimed test Pi (one per wallet address)
    const existingClaimResult = await query(
      `SELECT * FROM a2u_payments
       WHERE to_address = $1
       AND transaction_type = 'customer_reward'
       AND metadata->>'reward_type' = 'test_pi_claim'
       AND status = 'completed'
       LIMIT 1`,
      [user.pi_wallet_address]
    );

    if (existingClaimResult.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Already claimed',
        message: 'This wallet address has already claimed the 1 test Pi bonus',
        alreadyClaimed: true
      });
    }

    // Step 3: Import and call A2U payment logic directly
    const { processA2UPayment } = await import('@/lib/a2u-payment');

    const a2uResult = await processA2UPayment({
      uid: user.pi_uid,
      amount: 1.00,
      memo: 'Test Pi Claim - One-time pioneer bonus',
      transaction_type: 'customer_reward',
      metadata: {
        reward_type: 'test_pi_claim',
        user_id: userId,
        claimed_at: new Date().toISOString()
      }
    });

    if (!a2uResult.success) {
      return NextResponse.json(
        { success: false, error: a2uResult.error || 'A2U payment failed' },
        { status: 500 }
      );
    }

    console.log('✅ Test Pi claim completed via A2U:', a2uResult);

    return NextResponse.json({
      success: true,
      payment: a2uResult.payment,
      message: '✅ Successfully claimed 1 test Pi! Check your wallet.'
    });

  } catch (error) {
    console.error('Test Pi claim error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to claim test Pi' },
      { status: 500 }
    );
  }
}

// GET endpoint to check if user has already claimed
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    // Get user details to check wallet address
    const userResult = await query(
      `SELECT pi_wallet_address FROM users WHERE id = $1`,
      [userId]
    );

    if (!userResult.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Check if this wallet address has already claimed (one per wallet address)
    const existingClaimResult = await query(
      `SELECT * FROM a2u_payments
       WHERE to_address = $1
       AND transaction_type = 'customer_reward'
       AND metadata->>'reward_type' = 'test_pi_claim'
       AND status = 'completed'
       LIMIT 1`,
      [user.pi_wallet_address]
    );

    const hasClaimed = existingClaimResult.rows.length > 0;

    return NextResponse.json({
      success: true,
      hasClaimed,
      claim: hasClaimed ? {
        id: existingClaimResult.rows[0].id,
        transactionNumber: existingClaimResult.rows[0].transaction_number,
        amount: existingClaimResult.rows[0].amount,
        claimedAt: existingClaimResult.rows[0].created_at,
        txid: existingClaimResult.rows[0].txid,
        status: existingClaimResult.rows[0].status
      } : null
    });

  } catch (error) {
    console.error('Test Pi claim check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check claim status' },
      { status: 500 }
    );
  }
}