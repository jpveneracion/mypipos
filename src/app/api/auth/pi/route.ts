import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { randomUUID } from 'crypto';

/**
 * Pi Network Authentication API (mypiroll-style)
 * POST /api/auth/pi
 * Body: { accessToken: string, user: { uid: string, username: string } }
 */
export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const startTime = Date.now();

  console.log(`🔍 [PI AUTH] ${requestId} - Request started`, {
    timestamp: new Date().toISOString(),
  });

  try {
    const body = await request.json();
    const { accessToken, user } = body;

    console.log(`📥 [PI AUTH] ${requestId} - Request body parsed`, {
      hasAccessToken: !!accessToken,
      hasUser: !!user,
      username: user?.username,
      uid: user?.uid,
    });

    if (!accessToken) {
      console.log(`⚠️ [PI AUTH] ${requestId} - No access token provided`);
      return NextResponse.json({ error: 'Missing access token' }, { status: 400 });
    }

    if (!user || !user.uid || !user.username) {
      console.log(`⚠️ [PI AUTH] ${requestId} - Invalid user data`);
      return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
    }

    // 1. Verify with Pi Network API (CRITICAL - this was missing!)
    const piApiUrl = process.env.PI_API_URL || 'https://api.minepi.com/v2';

    console.log('🌐 [PI AUTH] Calling Pi Network API to verify token', { piApiUrl });

    const piResponse = await fetch(`${piApiUrl}/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!piResponse.ok) {
      const errorText = await piResponse.text();
      console.log('❌ [PI AUTH] Pi Network API verification failed', {
        status: piResponse.status,
        errorText
      });
      return NextResponse.json(
        { error: 'Invalid Pi access token', details: errorText },
        { status: 401 }
      );
    }

    const piUser = await piResponse.json();

    console.log('✅ [PI AUTH] Pi Network API verification successful', {
      piUid: piUser.uid,
      piUsername: piUser.username,
      clientUid: user.uid,
      clientUsername: user.username,
      match: piUser.uid === user.uid && piUser.username === user.username
    });

    // 2. Verify the frontend user data matches the API response
    if (piUser.uid !== user.uid || piUser.username !== user.username) {
      console.error('❌ [PI AUTH] User data mismatch!', {
        apiUid: piUser.uid,
        apiUsername: piUser.username,
        clientUid: user.uid,
        clientUsername: user.username
      });
      return NextResponse.json(
        { error: 'User data verification failed' },
        { status: 400 }
      );
    }

    // 3. Create or update user using enhanced SECURITY DEFINER function
    console.log('🧠 [PI AUTH] Using enhanced SECURITY DEFINER function: create_or_update_user()');

    const result = await query(
      'SELECT * FROM create_or_update_user($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [user.uid, user.username, 'pioneer', 'customer', false, null, null, null, null, null]
    );

    if (!result.rows || result.rows.length === 0) {
      console.error('❌ [PI AUTH] No user returned from database');
      return NextResponse.json(
        { error: 'Failed to create user in database' },
        { status: 500 }
      );
    }

    const dbUser = {
      id: result.rows[0].id,
      pi_username: result.rows[0].pi_username,
      userType: result.rows[0].userType,
      role: result.rows[0].role,
      onboardingComplete: result.rows[0].onboardingComplete || false,
      merchant_id: result.rows[0].merchant_id,
    };

    console.log('✅ [PI AUTH] User processed successfully', {
      userId: dbUser.id,
      username: dbUser.pi_username,
      userType: dbUser.userType,
      role: dbUser.role,
      onboardingComplete: dbUser.onboardingComplete,
      merchant_id: dbUser.merchant_id
    });

    const duration = Date.now() - startTime;
    console.log(`✅ [PI AUTH] ${requestId} - Success`, {
      duration: `${duration}ms`,
      userId: dbUser.id
    });

    return NextResponse.json({
      success: true,
      user: dbUser,
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [PI AUTH] ${requestId} - REQUEST FAILED`, {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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
    // Use enhanced SECURITY DEFINER function to bypass RLS
    const result = await query(
      'SELECT * FROM create_or_update_user($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [userData.piUid, userData.username, 'pioneer', 'customer', false, null, null, null, null, null]
    );

    return {
      id: result.rows[0].id,
      pi_username: result.rows[0].pi_username,
      userType: result.rows[0].userType,
      role: result.rows[0].role,
      onboardingComplete: result.rows[0].onboardingComplete || false,
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