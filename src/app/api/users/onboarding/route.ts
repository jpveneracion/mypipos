/**
 * User Onboarding API
 * POST /api/users/onboarding
 *
 * Handles first-time user role selection and onboarding completion
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { role } = await request.json();

    if (!role || !['customer', 'merchant', 'both'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      );
    }

    // TODO: Implement proper database integration
    // For now, simulate the onboarding process

    let userRole = 'customer';
    let userType = 'customer';

    if (role === 'merchant') {
      userRole = 'merchant_admin';
      userType = 'merchant';
    } else if (role === 'both') {
      userRole = 'merchant_admin';
      userType = 'customer'; // Start with customer context
    }

    // Mock user update (replace with actual database query)
    const user = {
      id: randomUUID(),
      pi_uid: randomUUID(),
      pi_username: 'pioneer',
      user_type: userType,
      user_role: userRole,
      onboarding_complete: true,
      merchant_id: role === 'both' || role === 'merchant' ? randomUUID() : null,
    };

    console.log('✅ User onboarding completed:', {
      role,
      userType,
      userRole,
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