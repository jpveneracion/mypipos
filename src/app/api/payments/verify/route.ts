/**
 * Pi Network Payment Verification Endpoint
 * POST /api/payments/verify
 *
 * Verify payment status and details using Pi API key
 * Reference: https://developers.minepi.com/docs/payments-api
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { paymentId } = await request.json();

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Missing paymentId' },
        { status: 400 }
      );
    }

    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'PI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const piApiUrl = process.env.PI_API_URL || 'https://api.minepi.com/v2';

    // Get payment details from Pi API
    const response = await fetch(`${piApiUrl}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Pi API verification error:', error);
      return NextResponse.json(
        { error: 'Failed to verify payment', details: error },
        { status: response.status }
      );
    }

    const payment = await response.json();

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.identifier,
        status: payment.status,
        amount: payment.amount,
        memo: payment.memo,
        created_at: payment.created_at,
        txid: payment.transaction_id,
      },
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}