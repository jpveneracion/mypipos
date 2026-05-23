/**
 * Pi Network Payment Approval Endpoint
 * POST /api/payments/approve
 *
 * Server-side payment approval using Pi API key
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

    // Approve payment using Pi API key
    const response = await fetch(`${piApiUrl}/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Pi API approval error:', error);
      return NextResponse.json(
        { error: 'Failed to approve payment', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      payment: result,
    });

  } catch (error) {
    console.error('Payment approval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}