/**
 * Reset Test Pi Claim Status
 * POST /api/debug/reset-test-claim
 *
 * Clears test Pi claim status for a user (for testing purposes)
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

    console.log('Resetting test Pi claim for userId:', userId);

    // Find existing test Pi claim
    const existingClaimResult = await query(
      `SELECT * FROM a2u_payments
       WHERE to_user_id = $1
       AND transaction_type = 'customer_reward'
       AND metadata->>'reward_type' = 'test_pi_claim'
       LIMIT 1`,
      [userId]
    );

    if (existingClaimResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No test Pi claim found - nothing to reset',
        reset: false
      });
    }

    const existingClaim = existingClaimResult.rows[0];

    // Delete the test Pi claim record
    await query(
      `DELETE FROM a2u_payments
       WHERE id = $1
       AND transaction_type = 'customer_reward'
       AND metadata->>'reward_type' = 'test_pi_claim'`,
      [existingClaim.id]
    );

    return NextResponse.json({
      success: true,
      message: '✅ Test Pi claim status reset successfully',
      reset: true,
      deletedClaim: {
        id: existingClaim.id,
        transactionNumber: existingClaim.transaction_number,
        amount: existingClaim.amount,
        claimedAt: existingClaim.created_at
      },
      nextSteps: [
        '✅ Claim status cleared',
        '🎯 User can now claim Test Pi again',
        '📱 Refresh customer page to see claim button'
      ]
    });

  } catch (error) {
    console.error('Reset test Pi claim error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset test Pi claim' },
      { status: 500 }
    );
  }
}

// GET endpoint to check if user has claim and offer reset
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId parameter required',
        usage: 'Add ?userId=YOUR_USER_ID to check claim status'
      }, { status: 400 });
    }

    // Check for existing test Pi claim
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
      userId,
      hasClaimed,
      claimInfo: hasClaimed ? {
        id: existingClaimResult.rows[0].id,
        transactionNumber: existingClaimResult.rows[0].transaction_number,
        amount: existingClaimResult.rows[0].amount,
        claimedAt: existingClaimResult.rows[0].created_at
      } : null,
      resetInstructions: hasClaimed ? {
        method: 'POST',
        endpoint: '/api/debug/reset-test-claim',
        body: { userId }
      } : {
        message: 'No claim found - user can claim Test Pi'
      }
    });

  } catch (error) {
    console.error('Check claim status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check claim status' },
      { status: 500 }
    );
  }
}