/**
 * Debug Test Claim Status
 * GET /api/debug/test-claim-status?userId=xxx
 *
 * Debug endpoint to check why Test Pi Claim card might not be showing
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId parameter required',
        debug: {
          endpoint: '/api/debug/test-claim-status',
          usage: 'Add ?userId=YOUR_USER_ID to the URL'
        }
      }, { status: 400 });
    }

    console.log('Debugging claim status for userId:', userId);

    // Step 1: Check if user exists
    const userResult = await query(
      `SELECT id, username, pi_uid FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
        debug: {
          userId: userId,
          userExists: false
        }
      }, { status: 404 });
    }

    const user = userResult.rows[0];

    // Step 2: Check for existing test Pi claims
    const existingClaimResult = await query(
      `SELECT * FROM a2u_payments
       WHERE to_user_id = $1
       AND transaction_type = 'customer_reward'
       AND metadata->>'reward_type' = 'test_pi_claim'
       LIMIT 1`,
      [userId]
    );

    const hasClaimed = existingClaimResult.rows.length > 0;

    // Step 3: Check if a2u_payments table exists and is accessible
    const tableCheckResult = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'a2u_payments'
      )`
    );

    const tableExists = tableCheckResult.rows[0].exists;

    return NextResponse.json({
      success: true,
      debug: {
        userId: userId,
        userExists: true,
        user: {
          id: user.id,
          username: user.username,
          pi_uid: user.pi_uid ? 'Set' : 'Not set'
        },
        a2uPaymentsTable: {
          exists: tableExists,
          accessible: true
        },
        claimStatus: {
          hasClaimed: hasClaimed,
          claimCount: existingClaimResult.rows.length,
          claimDetails: hasClaimed ? {
            id: existingClaimResult.rows[0].id,
            transactionNumber: existingClaimResult.rows[0].transaction_number,
            amount: existingClaimResult.rows[0].amount,
            claimedAt: existingClaimResult.rows[0].created_at
          } : null
        },
        expectedBehavior: {
          shouldShowCard: !hasClaimed,
          componentWillShow: !hasClaimed ? 'Test Pi Claim Card' : 'Already Claimed Message'
        },
        nextSteps: [
          hasClaimed
            ? '✅ User has already claimed - component will show "Already Claimed" message'
            : '🎯 User has not claimed - component will show claim button',
          '📝 Check browser console for component logs',
          '🔍 Check React DevTools to see component state'
        ]
      }
    });

  } catch (error) {
    console.error('Debug claim status error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Debug query failed',
      debug: {
        error: error instanceof Error ? error.message : String(error),
        suggestion: 'Check database connection and a2u_payments table exists'
      }
    }, { status: 500 });
  }
}