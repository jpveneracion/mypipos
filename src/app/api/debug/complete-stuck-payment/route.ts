import { NextResponse } from 'next/server';

/**
 * Complete stuck A2U payment on server
 * POST /api/debug/complete-stuck-payment
 *
 * Step 2 of clearing a stuck payment: complete on server
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paymentId, txid } = body;

    console.log('[Debug Complete] Completing stuck payment on server:', { paymentId, txid });

    if (!paymentId || !txid) {
      return NextResponse.json(
        { error: 'Missing paymentId or txid' },
        { status: 400 }
      );
    }

    // Import pi-backend dynamically
    const piBackend = await import('pi-backend');
    const PiNetworkClass = (piBackend as any).default || piBackend;

    const PI_API_KEY = process.env.PI_API_KEY;
    const PI_WALLET_PRIVATE_KEY = process.env.PI_WALLET_PRIVATE_KEY;

    if (!PI_API_KEY || !PI_WALLET_PRIVATE_KEY) {
      throw new Error('Pi Network credentials not configured (PI_API_KEY, PI_WALLET_PRIVATE_KEY)');
    }

    const pi = new PiNetworkClass(PI_API_KEY, PI_WALLET_PRIVATE_KEY);
    console.log('[Debug Complete] Pi SDK initialized');

    // Complete payment on server
    const completedPayment = await pi.completePayment(paymentId, txid);
    console.log('[Debug Complete] ✅ Payment completed:', JSON.stringify(completedPayment.status, null, 2));

    return NextResponse.json({
      success: true,
      payment: completedPayment,
      message: 'Payment completed on server successfully'
    });

  } catch (error: any) {
    console.error('[Debug Complete] ❌ Error:', error.message);

    if (error.response) {
      console.error('[Debug Complete] Full error response:', JSON.stringify(error.response.data, null, 2));
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.response?.data
      },
      { status: 500 }
    );
  }
}
