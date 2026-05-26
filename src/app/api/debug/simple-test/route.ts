/**
 * Simple test endpoint for A2U lookup
 * GET /api/debug/simple-test
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId parameter required',
        usage: '?userId=d821f5d3-8e78-4cfe-bd0f-891d9198e6c8',
        test_users: [
          'd821f5d3-8e78-4cfe-bd0f-891d9198e6c8',
          'eaf4c73b-611e-4742-b7fe-5b48ff8125b0'
        ]
      });
    }

    // Step 1: Get user by ID
    const userById = await query(
      `SELECT id, username, pi_uid, pi_wallet_address FROM users WHERE id = $1`,
      [userId]
    );

    if (!userById.rows[0]) {
      return NextResponse.json({
        success: false,
        error: 'User not found by ID',
        userId
      });
    }

    const user = userById.rows[0];

    // Step 2: Try to find user by pi_uid
    let userByPiUid = null;
    if (user.pi_uid) {
      const userByPiUidResult = await query(
        `SELECT id, username, pi_uid, pi_wallet_address FROM users WHERE pi_uid = $1`,
        [user.pi_uid]
      );
      userByPiUid = userByPiUidResult.rows[0];
    }

    // Step 3: Return results
    return NextResponse.json({
      success: true,
      test_user: userId,
      step1_find_by_id: {
        success: !!user,
        user: user
      },
      step2_find_by_pi_uid: {
        success: !!userByPiUid,
        user: userByPiUid,
        lookup_match: userByPiUid?.id === user?.id
      },
      ready_for_claim: !!(user && user.pi_uid && user.pi_wallet_address),
      error_details: {
        missing_pi_uid: !user?.pi_uid,
        missing_wallet: !user?.pi_wallet_address,
        lookup_failed: !!(user?.pi_uid && !userByPiUid)
      }
    });

  } catch (error) {
    console.error('[SIMPLE-TEST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}