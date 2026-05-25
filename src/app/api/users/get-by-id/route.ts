/**
 * Get User by ID
 * POST /api/users/get-by-id
 *
 * Returns user details including Pi UID for A2U payments
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

    // Get user by ID
    const userResult = await query(
      `SELECT id, username, pi_uid, pi_wallet_address, created_at FROM users WHERE id = $1`,
      [userId]
    );

    if (!userResult.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        pi_uid: user.pi_uid,
        pi_wallet_address: user.pi_wallet_address,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get user details' },
      { status: 500 }
    );
  }
}