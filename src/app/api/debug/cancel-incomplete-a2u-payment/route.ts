import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Cancel incomplete A2U payment
 * POST /api/debug/cancel-incomplete-a2u-payment
 *
 * Cancels any incomplete A2U payment that's blocking new payments
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    console.log('[Debug Cancel] Cancelling incomplete A2U payment for user:', userId);

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Find the most recent incomplete A2U payment
    const result = await query(
      `SELECT * FROM a2u_payments
       WHERE to_user_id = $1
       AND transaction_type = 'customer_reward'
       AND metadata->>'reward_type' = 'test_pi_claim'
       AND (status = 'pending' OR status = 'incomplete')
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No incomplete test_pi_claim payment found for this user' },
        { status: 404 }
      );
    }

    const payment = result.rows[0];

    // Try to cancel via Pi API if we have a payment_id
    if (payment.payment_id) {
      try {
        const apiKey = process.env.PI_API_KEY;
        const apiUrl = process.env.PI_API_URL || 'https://api.minepi.com/v2';

        const cancelResponse = await fetch(`${apiUrl}/payments/${payment.payment_id}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        if (cancelResponse.ok) {
          console.log('[Debug Cancel] Payment cancelled via Pi API:', payment.payment_id);
        } else {
          console.warn('[Debug Cancel] Failed to cancel via Pi API:', await cancelResponse.text());
        }
      } catch (error) {
        console.error('[Debug Cancel] Error cancelling via Pi API:', error);
      }
    }

    // Mark the payment as cancelled in database
    await query(
      `UPDATE a2u_payments SET
        status = 'cancelled',
        error_message = 'Cancelled - was blocking new A2U payments'
       WHERE id = $1`,
      [payment.id]
    );

    console.log('[Debug Cancel] Payment marked as cancelled:', payment.transaction_number);

    return NextResponse.json({
      success: true,
      message: 'Incomplete payment cancelled successfully. You can try claiming again.',
      payment: {
        id: payment.id,
        transaction_number: payment.transaction_number,
        payment_id: payment.payment_id,
        previous_status: payment.status,
        new_status: 'cancelled'
      }
    });

  } catch (error) {
    console.error('[Debug Cancel] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
