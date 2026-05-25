/**
 * Clear Incomplete Payment (The "Janitor" Protocol)
 * POST /api/payments/clear-incomplete-payment
 *
 * Clears zombie/incomplete payments by:
 * 1. Try cancel (works for app-to-user payments)
 * 2. If cancel fails with 403, extract txid from error response and complete
 *
 * Matches mypiroll implementation for handling zombie payments
 */

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const VERSION = 'clear-incomplete-payment-v1';

  try {
    const body = await request.json();
    const { paymentId } = body;

    console.log(`🧹 [${VERSION}] Clearing zombie payment:`, paymentId);

    if (!paymentId) {
      console.error(`[${VERSION}] Missing paymentId from frontend`);
      return NextResponse.json(
        { error: 'Missing paymentId' },
        { status: 400 }
      );
    }

    // Use Master API Key from backend (never exposed to frontend)
    const apiKey = process.env.PI_API_KEY;
    const apiUrl = process.env.PI_API_URL || 'https://api.minepi.com/v2';

    console.log(`[${VERSION}] Using Master API Key:`, {
      hasKey: !!apiKey,
      keyPrefix: apiKey ? `${apiKey.substring(0, 8)}...` : 'none'
    });

    if (!apiKey) {
      console.error(`[${VERSION}] PI_API_KEY not configured in backend`);
      return NextResponse.json(
        { error: 'Backend configuration missing - Master API key not set' },
        { status: 500 }
      );
    }

    // Step 1: Try to cancel (works for app-to-user payments)
    console.log(`[${VERSION}] Step 1: Trying to cancel payment...`);
    const cancelResponse = await fetch(`${apiUrl}/payments/${paymentId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancel_message: 'Zombie payment cleaned up by myPiPOS backend'
      })
    });

    if (cancelResponse.ok) {
      const cancelResult = await cancelResponse.json();
      console.log(`[${VERSION}] ✅ Zombie payment cancelled successfully:`, cancelResult);

      return NextResponse.json({
        success: true,
        message: 'Zombie payment cleared (cancelled)',
        method: 'cancel',
        paymentId,
        result: cancelResult
      });
    }

    // Step 2: Cancel failed - check if it's a 403 with txid we can use
    const cancelErrorText = await cancelResponse.text();
    console.log(`[${VERSION}] Cancel failed, parsing error response...`);

    let cancelError;
    try {
      cancelError = JSON.parse(cancelErrorText);
    } catch (parseError) {
      console.error(`[${VERSION}] Failed to parse cancel error:`, cancelErrorText);
      return NextResponse.json(
        { error: `Cancel failed and couldn't parse error: ${cancelErrorText}` },
        { status: 500 }
      );
    }

    console.log(`[${VERSION}] Cancel error:`, {
      error: cancelError.error,
      error_message: cancelError.error_message
    });

    // Step 3: If it's a 403 with payment data, extract txid and complete
    if (cancelError.payment?.transaction?.txid && cancelError.payment?.transaction?.verified) {
      const txid = cancelError.payment.transaction.txid;
      const direction = cancelError.payment.direction;

      console.log(`[${VERSION}] Step 2: Found verified txid in cancel error!`);
      console.log(`[${VERSION}] direction:`, direction);
      console.log(`[${VERSION}] txid:`, txid);
      console.log(`[${VERSION}] Completing payment with ACTUAL txid...`);

      const completeResponse = await fetch(`${apiUrl}/payments/${paymentId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txid: txid  // Use the actual txid from the cancel error response
        })
      });

      if (!completeResponse.ok) {
        const completeErrorText = await completeResponse.text();
        console.error(`[${VERSION}] Complete failed:`, completeErrorText);
        return NextResponse.json(
          { error: `Failed to complete payment: ${completeErrorText}` },
          { status: completeResponse.status }
        );
      }

      const completeResult = await completeResponse.json();
      console.log(`[${VERSION}] ✅ Zombie payment COMPLETED successfully!`);
      console.log(`[${VERSION}] Method: complete with verified txid`);
      console.log(`[${VERSION}] TXID:`, txid);

      return NextResponse.json({
        success: true,
        message: 'Zombie payment cleared (completed with verified txid from cancel error)',
        method: 'complete-from-cancel-error',
        paymentId,
        txid,
        result: completeResult
      });
    }

    // Step 4: No txid found - give up
    console.error(`[${VERSION}] ❌ Cannot clear - no verified txid found in cancel error`);
    return NextResponse.json(
      {
        error: `Cannot clear payment - cancel failed and no verified txid to complete with`,
        cancelError: cancelError.error_message,
        suggestion: 'Payment may need to be completed manually in Pi Browser app'
      },
      { status: 500 }
    );

  } catch (error) {
    console.error(`❌ [${VERSION}] Error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}