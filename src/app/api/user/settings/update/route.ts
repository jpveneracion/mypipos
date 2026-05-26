import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(request: NextRequest) {
  try {
    // Simple approach like mypiroll - get userId from body
    const body = await request.json();
    const { userId, pi_address, cashback_preferences, payment_preferences, notification_preferences } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId required' },
        { status: 400 }
      );
    }

    // Update each field individually
    if (pi_address !== undefined) {
      await query(
        'UPDATE users SET pi_address = $1, updated_at = NOW() WHERE id = $2',
        [pi_address, userId]
      );
    }

    if (cashback_preferences) {
      await query(
        'UPDATE users SET cashback_preferences = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(cashback_preferences), userId]
      );
    }

    if (payment_preferences) {
      await query(
        'UPDATE users SET payment_preferences = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(payment_preferences), userId]
      );
    }

    if (notification_preferences) {
      await query(
        'UPDATE users SET notification_preferences = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(notification_preferences), userId]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
