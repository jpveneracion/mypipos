/**
 * User Settings API Endpoint
 * GET /api/user/settings
 *
 * Returns the authenticated user's complete account settings
 * Requires valid authentication token
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser, createErrorResponse } from '@/lib/auth-api';

/**
 * GET /api/user/settings
 * Get current authenticated user's complete account settings
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        createErrorResponse('Authentication required', 401),
        { status: 401 }
      );
    }

    const userId = user.id;

    // Fetch user settings using security function
    const result = await query(
      'SELECT * FROM get_user_account_settings($1)',
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        createErrorResponse('User not found', 404),
        { status: 404 }
      );
    }

    const settings = result.rows[0].get_user_account_settings;

    // Return personal settings
    return NextResponse.json({
      success: true,
      data: {
        profile: {
          username: settings.user_info.username,
          email: settings.user_info.email,
          first_name: settings.user_info.first_name,
          last_name: settings.user_info.last_name,
          phone: settings.user_info.phone,
          pi_username: settings.user_info.pi_username,
          user_type: settings.user_info.user_type,
          role: settings.user_info.role,
          merchant_id: settings.user_info.merchant_id
        },
        personal: {
          pi_address: settings.personal.pi_address,
          cashback_preferences: settings.personal.cashback_preferences,
          payment_preferences: settings.personal.payment_preferences,
          notification_preferences: settings.personal.notification_preferences,
          saved_addresses: settings.personal.saved_addresses,
          purchase_history_settings: settings.personal.purchase_history_settings
        },
        business: settings.business
      }
    });

  } catch (error) {
    console.error('Error fetching user settings:', error);

    // Return detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        debug: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}