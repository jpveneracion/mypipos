import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth-api';

const VALID_PERSONAL_FIELDS = [
  'cashback_preferences',
  'payment_preferences',
  'notification_preferences',
  'saved_addresses',
  'purchase_history_settings',
  'pi_address'
];

export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getAuthenticatedUser(request);
    if (!session?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.id;
    const body = await request.json();
    const { field, value } = body;

    // Validate field name
    if (!VALID_PERSONAL_FIELDS.includes(field)) {
      return NextResponse.json(
        { error: 'Invalid field name', field },
        { status: 400 }
      );
    }

    // Get client IP and user agent for audit log
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     null;
    const userAgent = request.headers.get('user-agent') || null;

    // Handle pi_address as special case (text field)
    let updateValue = value;
    if (field === 'pi_address') {
      updateValue = JSON.stringify({ pi_address: value });
    } else {
      updateValue = JSON.stringify(value);
    }

    // Update settings using security function
    const result = await query(
      `SELECT update_personal_settings($1, $2, $3::jsonb, NULL, $4::inet, $5)`,
      [userId, field, updateValue, ipAddress, userAgent]
    );

    const updatedValue = result.rows[0].update_personal_settings;

    return NextResponse.json({
      success: true,
      field,
      updatedValue: updatedValue
    });

  } catch (error) {
    console.error('Error updating personal settings:', error);

    // Check for constraint violations
    if (error instanceof Error && error.message?.includes('Invalid personal settings field')) {
      return NextResponse.json(
        { error: 'Invalid field name' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
