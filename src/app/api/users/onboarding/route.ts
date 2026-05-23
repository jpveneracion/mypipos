/**
 * User Onboarding API
 * POST /api/users/onboarding
 *
 * Handles first-time user role selection and onboarding completion
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { role, userId } = await request.json();

    if (!role || !['customer', 'merchant', 'both'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Determine user type and role
    let userRole = 'merchant_admin';
    let userType = 'customer';
    let merchantId = null;

    if (role === 'merchant') {
      userRole = 'merchant_admin';
      userType = 'merchant';
      // Create merchant record
      merchantId = randomUUID();
      await query(
        `INSERT INTO merchants (id, business_name, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [merchantId, `${userType}'s Business`, true]
      );
    } else if (role === 'both') {
      userRole = 'merchant_admin';
      userType = 'customer';
      // Create merchant record for "both" users
      merchantId = randomUUID();
      await query(
        `INSERT INTO merchants (id, business_name, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [merchantId, `${userType}'s Business`, true]
      );
    }

    // Update user with onboarding completion using SECURITY DEFINER function
    const result = await query(
      'SELECT * FROM complete_user_onboarding($1, $2, $3, $4)',
      [userId, userType, userRole, merchantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = result.rows[0];

    console.log('✅ User onboarding completed:', {
      userId,
      role,
      userType,
      userRole,
      merchantId,
      onboarding_complete: true
    });

    return NextResponse.json({
      success: true,
      user,
      nextStep: getNextStep(role),
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getNextStep(role: string): string {
  switch (role) {
    case 'customer':
      return '/customer';
    case 'merchant':
      return '/merchant/onboarding';
    case 'both':
      return '/customer';
    default:
      return '/';
  }
}