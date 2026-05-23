import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { accessToken, user } = await request.json();

    // Verify the access token with Pi Network API
    // You'll need to implement server-side verification
    const piApiResponse = await verifyPiAccessToken(accessToken);

    if (!piApiResponse.valid) {
      return NextResponse.json(
        { error: 'Invalid access token' },
        { status: 401 }
      );
    }

    // Create or update user in your database
    // This is where you'd integrate with your database
    const dbUser = await upsertUser({
      piUid: user.uid,
      username: user.username,
      role: 'cashier', // Default role
    });

    // Create a session token for your app
    const sessionToken = generateSessionToken(dbUser);

    return NextResponse.json({
      success: true,
      user: dbUser,
      sessionToken,
    });

  } catch (error) {
    console.error('Pi auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// Helper functions (implement these based on your needs)
async function verifyPiAccessToken(accessToken: string) {
  // Implement actual Pi API verification
  // This should call Pi Network's API to verify the token
  try {
    const response = await fetch('https://api.minepi.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const userData = await response.json();
      return { valid: true, user: userData };
    }

    return { valid: false };
  } catch (error) {
    console.error('Pi API verification error:', error);
    return { valid: false };
  }
}

async function upsertUser(userData: any) {
  try {
    // Check if user exists
    const existingUser = await query(
      'SELECT * FROM users WHERE pi_uid = $1',
      [userData.piUid]
    );

    if (existingUser.rows.length > 0) {
      // User exists - update last login
      const updatedUser = await query(
        `UPDATE users
         SET last_login_at = NOW(),
             updated_at = NOW()
         WHERE pi_uid = $1
         RETURNING id, pi_username, user_type, role, onboarding_complete, merchant_id`,
        [userData.piUid]
      );

      return {
        id: updatedUser.rows[0].id,
        pi_username: updatedUser.rows[0].pi_username,
        user_type: updatedUser.rows[0].user_type,
        role: updatedUser.rows[0].role,
        onboarding_complete: updatedUser.rows[0].onboarding_complete || false,
        merchant_id: updatedUser.rows[0].merchant_id,
      };
    }

    // Create new user
    const newUser = await query(
      `INSERT INTO users (pi_uid, pi_username, user_type, role, onboarding_complete, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, pi_username, user_type, role, onboarding_complete, merchant_id`,
      [userData.piUid, userData.username, 'pioneer', 'customer', false, true]
    );

    return {
      id: newUser.rows[0].id,
      pi_username: newUser.rows[0].pi_username,
      user_type: newUser.rows[0].user_type,
      role: newUser.rows[0].role,
      onboarding_complete: newUser.rows[0].onboarding_complete || false,
      merchant_id: newUser.rows[0].merchant_id,
    };
  } catch (error) {
    console.error('Database upsert error:', error);
    throw new Error('Failed to create/update user in database');
  }
}

function generateSessionToken(user: any) {
  // Implement session token generation
  // This could be a JWT or other token format
  return Buffer.from(JSON.stringify(user)).toString('base64');
}