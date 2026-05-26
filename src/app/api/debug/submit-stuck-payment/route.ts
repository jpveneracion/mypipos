import { NextResponse } from 'next/server';

/**
 * Submit stuck A2U payment to blockchain
 * POST /api/debug/submit-stuck-payment
 *
 * Step 1 of clearing a stuck payment: submit to blockchain
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paymentId } = body;

    console.log('[Debug Submit] Submitting stuck payment to blockchain:', paymentId);

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Missing paymentId' },
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
    console.log('[Debug Submit] Pi SDK initialized');

    // Submit to blockchain
    const txid = await pi.submitPayment(paymentId);
    console.log('[Debug Submit] ✅ Payment submitted with txid:', txid);

    return NextResponse.json({
      success: true,
      txid: txid,
      message: 'Payment submitted to blockchain successfully'
    });

  } catch (error: any) {
    console.error('[Debug Submit] ❌ Error:', error.message);

    if (error.response) {
      console.error('[Debug Submit] Full error response:', JSON.stringify(error.response.data, null, 2));
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
