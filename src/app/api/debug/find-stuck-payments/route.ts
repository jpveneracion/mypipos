import { NextResponse } from 'next/server';

/**
 * Find stuck A2U payments that are blocking new payments
 * GET /api/debug/find-stuck-payments
 *
 * Queries Pi API to find incomplete A2U payments
 */
export async function GET() {
  try {
    console.log('[Debug Find] Looking for stuck A2U payments...');

    // Import pi-backend dynamically
    const piBackend = await import('pi-backend');
    const PiNetworkClass = (piBackend as any).default || piBackend;

    const PI_API_KEY = process.env.PI_API_KEY;
    const PI_WALLET_PRIVATE_KEY = process.env.PI_WALLET_PRIVATE_KEY;

    if (!PI_API_KEY || !PI_WALLET_PRIVATE_KEY) {
      throw new Error('Pi Network credentials not configured (PI_API_KEY, PI_WALLET_PRIVATE_KEY)');
    }

    const pi = new PiNetworkClass(PI_API_KEY, PI_WALLET_PRIVATE_KEY);
    console.log('[Debug Find] Pi SDK initialized');

    // Get incomplete payments from Pi API
    const apiUrl = process.env.PI_API_URL || 'https://api.minepi.com/v2';

    const response = await fetch(`${apiUrl}/payments/incomplete`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Pi API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[Debug Find] Found incomplete payments:', data);

    // Filter for A2U payments (direction: app_to_user)
    const stuckA2UPayments = (data.payments || []).filter((payment: any) =>
      payment.direction === 'app_to_user' &&
      !payment.status.developer_completed &&
      !payment.status.cancelled &&
      !payment.status.user_cancelled
    );

    console.log(`[Debug Find] Found ${stuckA2UPayments.length} stuck A2U payments`);

    return NextResponse.json({
      success: true,
      payments: stuckA2UPayments,
      count: stuckA2UPayments.length
    });

  } catch (error: any) {
    console.error('[Debug Find] ❌ Error:', error.message);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        payments: []
      },
      { status: 500 }
    );
  }
}
