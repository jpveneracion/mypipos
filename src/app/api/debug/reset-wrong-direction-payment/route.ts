import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Reset A2U payment that was completed with wrong direction
 * POST /api/debug/reset-wrong-direction-payment
 *
 * This resets payments that were incorrectly marked as completed
 * when they were actually U2A instead of A2U payments.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    console.log('[Debug Reset] Resetting wrong-direction A2U payment for user:', userId);

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Find the most recent A2U payment that was incorrectly completed
    const result = await query(
      `SELECT * FROM a2u_payments
       WHERE to_user_id = $1
       AND transaction_type = 'customer_reward'
       AND metadata->>'reward_type' = 'test_pi_claim'
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No test_pi_claim payment found for this user' },
        { status: 404 }
      );
    }

    const payment = result.rows[0];

    // Reset the payment to pending status
    await query(
      `UPDATE a2u_payments SET
        status = 'pending',
        payment_id = '',
        txid = NULL,
        payment_completed_at = NULL,
        completed_at = NULL,
        error_message = 'Reset - was completed with wrong payment direction (U2A instead of A2U)'
      WHERE id = $1`,
      [payment.id]
    );

    console.log('[Debug Reset] Reset payment:', payment.transaction_number);

    return NextResponse.json({
      success: true,
      message: 'Payment reset successfully. You can try claiming again.',
      payment: {
        id: payment.id,
        transaction_number: payment.transaction_number,
        previous_status: payment.status,
        new_status: 'pending'
      }
    });

  } catch (error) {
    console.error('[Debug Reset] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}