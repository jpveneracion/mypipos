/**
 * Merchant Business Settings API Endpoint
 * GET /api/merchant/settings
 *
 * Returns business settings for authenticated merchant users
 * Requires merchant role (merchant_admin or merchant_staff)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth-api';

/**
 * GET /api/merchant/settings
 * Get business settings for authenticated merchant user
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user - support both auth header and userId query param
    const user = await getAuthenticatedUser(request);

    // Check for userId query parameter (fallback for non-auth requests)
    const url = new URL(request.url);
    const userIdParam = url.searchParams.get('userId');

    const userId = user?.id || userIdParam;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's merchant ID and role from users table
    const userResult = await query(
      'SELECT merchant_id, user_type FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { merchant_id, user_type } = userResult.rows[0];

    // Check if user has merchant role
    if (!merchant_id || !['merchant_admin', 'merchant_staff'].includes(user_type)) {
      return NextResponse.json(
        { error: 'Access denied - merchant role required' },
        { status: 403 }
      );
    }

    // Fetch settings using security function
    const result = await query(
      'SELECT * FROM get_user_account_settings($1)',
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 }
      );
    }

    const settings = result.rows[0].get_user_account_settings;

    // Fetch merchant basic information
    const merchantResult = await query(
      'SELECT business_name, email, phone, website, city, state, postal_code, country FROM merchants WHERE id = $1',
      [merchant_id]
    );

    const merchantInfo = merchantResult.rows[0] || {};

    // Return business settings combined with merchant info
    return NextResponse.json({
      success: true,
      data: {
        merchant_id: merchant_id,
        business: {
          business_name: merchantInfo.business_name,
          email: merchantInfo.email,
          phone: merchantInfo.phone,
          website: merchantInfo.website,
          city: merchantInfo.city,
          state: merchantInfo.state,
          postal_code: merchantInfo.postal_code,
          country: merchantInfo.country,
          payment_methods: settings.business?.payment_methods || {},
          store_hours: settings.business?.store_hours || {},
          store_locations: settings.business?.store_locations || [],
          staff_permissions: settings.business?.staff_permissions || {},
          billing_info: settings.business?.billing_info || {},
          analytics_config: settings.business?.analytics_config || {}
        }
      }
    });

  } catch (error) {
    console.error('Error fetching business settings:', error);

    // Handle database errors
    if (error instanceof Error) {
      // Check for specific database error codes
      if (error.message.includes('connection') || error.message.includes('database')) {
        return NextResponse.json(
          { error: 'Database connection error' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch business settings' },
      { status: 500 }
    );
  }
}