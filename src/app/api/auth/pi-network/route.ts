import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, pi_username, pi_uid } = body;

    if (action === 'authenticate') {
      // In development mode, accept any Pi Network authentication
      // In production, this would verify with Pi Network servers

      if (!pi_username || !pi_uid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing Pi Network credentials'
          },
          { status: 400 }
        );
      }

      // Simulate successful authentication
      const authResponse = {
        success: true,
        user: {
          id: pi_uid,
          username: pi_username,
          authenticated: true,
          auth_token: `dev_token_${Date.now()}`,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        message: 'Successfully authenticated with Pi Network'
      };

      return NextResponse.json(authResponse);
    }

    if (action === 'create_payment') {
      // Simulate Pi Network payment creation
      const { amount, payment_id, memo } = body;

      if (!amount || !payment_id) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing payment parameters'
          },
          { status: 400 }
        );
      }

      const paymentResponse = {
        success: true,
        payment: {
          identifier: payment_id,
          amount: amount,
          memo: memo || 'myPiPOS purchase',
          created_at: new Date().toISOString(),
          status: 'pending',
          development_mode: true
        },
        message: 'Payment created successfully'
      };

      return NextResponse.json(paymentResponse);
    }

    if (action === 'complete_payment') {
      // Simulate payment completion
      const { payment_id } = body;

      if (!payment_id) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing payment ID'
          },
          { status: 400 }
          );
      }

      const completeResponse = {
        success: true,
        payment: {
          identifier: payment_id,
          status: 'completed',
          completed_at: new Date().toISOString(),
          transaction_id: `txn_${Date.now()}`,
          development_mode: true
        },
        message: 'Payment completed successfully'
      };

      return NextResponse.json(completeResponse);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action'
      },
      { status: 400 }
    );

  } catch (error) {
    console.error('Pi Network API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Pi Network authentication failed'
      },
      { status: 500 }
    );
  }
}