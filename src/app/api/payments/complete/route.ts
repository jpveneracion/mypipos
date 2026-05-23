/**
 * Pi Network Payment Completion Endpoint
 * POST /api/payments/complete
 *
 * Complete payment after blockchain transaction is submitted
 * Reference: https://developers.minepi.com/docs/payments-api
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { paymentId, txid } = await request.json();

    if (!paymentId || !txid) {
      return NextResponse.json(
        { error: 'Missing paymentId or txid' },
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

    // Complete payment using Pi API key
    const response = await fetch(`${piApiUrl}/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify({ txid }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Pi API completion error:', error);
      return NextResponse.json(
        { error: 'Failed to complete payment', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      payment: result,
      txid,
    });

  } catch (error) {
    console.error('Payment completion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}