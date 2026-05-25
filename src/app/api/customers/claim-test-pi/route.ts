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
    const { userId, paymentId, amount, action, txid, memo, type } = await request.json();

    console.log(`[${action?.toUpperCase()}] Test Pi claim request:`, { userId, paymentId, amount, action, txid });

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID required' },
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

    // Step 3: Handle different payment actions (matching mypiroll pattern)
    if (action === 'approve') {
      console.log('[APPROVE] Processing payment approval...');

      // Call Pi Network API to approve payment
      const apiKey = process.env.PI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { success: false, error: 'Pi Network not configured' },
          { status: 500 }
        );
      }

      const piApiUrl = process.env.PI_API_URL || 'https://api.minepi.com/v2';

      // Approve payment using Pi API key
      const approveResponse = await fetch(`${piApiUrl}/payments/${paymentId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${apiKey}`,
        },
      });

      if (!approveResponse.ok) {
        const errorText = await approveResponse.text();
        console.error('Pi API approval error:', errorText);
        return NextResponse.json(
          { success: false, error: 'Failed to approve payment with Pi Network' },
          { status: approveResponse.status }
        );
      }

      const approveResult = await approveResponse.json();
      console.log('✅ Payment approved with Pi Network:', approveResult);

      return NextResponse.json({
        success: true,
        payment: {
          id: paymentId,
          status: 'approved',
          message: 'Payment approved - waiting for wallet confirmation'
        }
      });

    } else if (action === 'complete') {
      console.log('[COMPLETE] Processing payment completion...');

      // Step 4: Create A2U payment record for test Pi claim (only on completion)
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
          paymentId,
          user.id,
          'customer',
          user.username,
          user.pi_uid,
          amount || 1.0,
          'One-time Pioneer Test Pi Bonus',
          'customer_reward',
          JSON.stringify({
            reward_type: 'test_pi_claim',
            claimed_at: new Date().toISOString(),
            txid: txid,
            completed: true
          }),
          'completed',
          'Pi Testnet'
        ]
      );

      const claim = claimResult.rows[0];

      console.log('✅ Test Pi claim completed:', claim);

      return NextResponse.json({
        success: true,
        payment: {
          id: claim.id,
          transactionNumber: claim.transaction_number,
          paymentId: claim.payment_id,
          amount: claim.amount,
          memo: claim.memo,
          status: claim.status,
          claimedAt: claim.created_at,
          txid: txid
        },
        message: '✅ Successfully claimed 1 test Pi! Check your wallet.'
      });
    } else {
      return NextResponse.json(
        { success: false, error: `Invalid action: ${action}. Use "approve" or "complete"` },
        { status: 400 }
      );
    }

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