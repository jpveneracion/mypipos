/**
 * Claim Test Pi - One-time Pioneer Bonus
 * POST /api/customers/claim-test-pi
 *
 * Allows registered pioneers to claim 1 test Pi (one-time only)
 * Uses A2U payment infrastructure
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    // Step 1: Check if user has already claimed test Pi
    const existingClaimResult = await query(
      `SELECT * FROM a2u_payments
       WHERE to_user_id = $1
       AND transaction_type = 'customer_reward'
       AND metadata->>'reward_type' = 'test_pi_claim'
       LIMIT 1`,
      [userId]
    );

    if (existingClaimResult.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Already claimed',
        message: 'You have already claimed your 1 test Pi bonus',
        alreadyClaimed: true
      });
    }

    // Step 2: Get user details
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

    // Step 3: Create A2U payment record for test Pi claim
    const claimResult = await query(
      `INSERT INTO a2u_payments (
        transaction_number,
        payment_id,
        to_user_id,
        to_user_type,
        to_user_username,
        to_user_pi_uid,
        amount,
        memo,
        transaction_type,
        metadata,
        status,
        network
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      ) RETURNING *`,
      [
        `A2U-TEST-${Date.now()}`,
        `TEST-CLAIM-${Date.now()}`,
        user.id,
        'customer',
        user.username,
        user.pi_uid,
        1.0, // 1 test Pi
        'One-time Pioneer Test Pi Bonus',
        'customer_reward',
        JSON.stringify({
          reward_type: 'test_pi_claim',
          claimed_at: new Date().toISOString()
        }),
        'completed', // Auto-complete for test Pi
        'Pi Testnet'
      ]
    );

    const claim = claimResult.rows[0];

    return NextResponse.json({
      success: true,
      claim: {
        id: claim.id,
        transactionNumber: claim.transaction_number,
        amount: claim.amount,
        memo: claim.memo,
        status: claim.status,
        claimedAt: claim.created_at
      },
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

    // Check if user has already claimed
    const existingClaimResult = await query(
      `SELECT * FROM a2u_payments
       WHERE to_user_id = $1
       AND transaction_type = 'customer_reward'
       AND metadata->>'reward_type' = 'test_pi_claim'
       LIMIT 1`,
      [userId]
    );

    const hasClaimed = existingClaimResult.rows.length > 0;

    return NextResponse.json({
      success: true,
      hasClaimed,
      claim: hasClaimed ? {
        id: existingClaimResult.rows[0].id,
        transactionNumber: existingClaimResult.rows[0].transaction_number,
        amount: existingClaimResult.rows[0].amount,
        claimedAt: existingClaimResult.rows[0].created_at
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