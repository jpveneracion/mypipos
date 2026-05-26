import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth-api';

const VALID_BUSINESS_FIELDS = [
  'payment_methods',
  'store_hours',
  'store_locations',
  'staff_permissions',
  'billing_info',
  'api_keys',
  'analytics_config'
];

export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getAuthenticatedUser(request);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const { field, value } = body;

    // Validate field name
    if (!VALID_BUSINESS_FIELDS.includes(field)) {
      return NextResponse.json(
        { error: 'Invalid field name', field },
        { status: 400 }
      );
    }

    // Get user's merchant ID and role
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

    // Only merchant_admin can update business settings
    if (!merchant_id || user_type !== 'merchant_admin') {
      return NextResponse.json(
        { error: 'Access denied - merchant admin role required' },
        { status: 403 }
      );
    }

    // Get client info for audit log
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     null;
    const userAgent = request.headers.get('user-agent') || null;

    // Update settings using security function
    const result = await query(
      `SELECT update_business_settings($1, $2, $3, $4::jsonb, NULL, $5::inet, $6)`,
      [merchant_id, userId, field, JSON.stringify(value), ipAddress, userAgent]
    );

    const updatedValue = result.rows[0].update_business_settings;

    return NextResponse.json({
      success: true,
      field,
      updatedValue: updatedValue
    });

  } catch (error) {
    console.error('Error updating business settings:', error);

    if (error.message?.includes('Invalid business settings field')) {
      return NextResponse.json(
        { error: 'Invalid field name', field: body?.field },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update business settings' },
      { status: 500 }
    );
  }
}
