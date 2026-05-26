/**
 * Debug endpoint to test A2U user lookup
 * POST /api/debug/test-a2u-lookup
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    console.log('[DEBUG A2U] Testing lookup for user ID:', userId);

    // Step 1: Get user by database ID
    const userByIdResult = await query(
      `SELECT id, username, pi_uid, pi_wallet_address FROM users WHERE id = $1`,
      [userId]
    );

    console.log('[DEBUG A2U] User by ID:', {
      found: userByIdResult.rows.length > 0,
      user: userByIdResult.rows[0]
    });

    if (!userByIdResult.rows[0]) {
      return NextResponse.json({
        success: false,
        error: 'User not found by ID',
        debug: { userId }
      });
    }

    const user = userByIdResult.rows[0];

    // Step 2: Try to find same user by pi_uid
    let userByPiUid = null;
    if (user.pi_uid) {
      const userByPiUidResult = await query(
        `SELECT id, username, pi_uid, pi_wallet_address FROM users WHERE pi_uid = $1`,
        [user.pi_uid]
      );

      console.log('[DEBUG A2U] User by pi_uid:', {
        found: userByPiUidResult.rows.length > 0,
        user: userByPiUidResult.rows[0],
        searchedFor: user.pi_uid
      });

      userByPiUid = userByPiUidResult.rows[0];
    }

    // Step 3: Check all users with pi_uid
    const allUsersWithPiUid = await query(
      `SELECT id, username, pi_uid, pi_wallet_address FROM users WHERE pi_uid IS NOT NULL`
    );

    return NextResponse.json({
      success: true,
      debug: {
        user_by_id: {
          found: !!user,
          data: user
        },
        user_by_pi_uid: {
          found: !!userByPiUid,
          data: userByPiUid
        },
        all_users_with_pi_uid: allUsersWithPiUid.rows,
        lookup_match: userByPiUid?.id === user?.id
      }
    });

  } catch (error) {
    console.error('[DEBUG A2U] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also support GET for easier testing
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId parameter required',
        usage: '/api/debug/test-a2u-lookup?userId=USER_ID_HERE'
      });
    }

    // Call the POST logic
    return await POST(request);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}