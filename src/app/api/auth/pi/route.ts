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
    // Use SECURITY DEFINER function to bypass RLS
    const result = await query(
      'SELECT * FROM create_or_update_user($1, $2, $3, $4, $5, $6)',
      [userData.piUid, userData.username, 'pioneer', 'customer', false, null]
    );

    return {
      id: result.rows[0].id,
      pi_username: result.rows[0].pi_username,
      user_type: result.rows[0].user_type,
      role: result.rows[0].role,
      onboarding_complete: result.rows[0].onboarding_complete || false,
      merchant_id: result.rows[0].merchant_id,
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