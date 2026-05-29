/**
 * A2U Payment Library
 * Uses pi-backend SDK for proper A2U (App-to-User) payments
 */

import { query } from '@/lib/db';

// Dynamic import for pi-backend (only available server-side)
let PiNetworkClass: any = null;

async function getPiInstance() {
  if (PiNetworkClass) return PiNetworkClass;

  try {
    if (typeof window !== 'undefined') {
      throw new Error('pi-backend can only be used server-side');
    }

    const piBackend = await import('pi-backend');
    // Handle both default export and named export
    PiNetworkClass = (piBackend as any).default || piBackend;
    return PiNetworkClass;
  } catch (error) {
    console.error('[A2U] Failed to import pi-backend:', error);
    throw new Error('pi-backend package not available. Install it with: npm install pi-backend');
  }
}

export interface A2UPaymentRequest {
  uid: string;
  amount: number;
  memo: string;
  transaction_type: 'merchant_payout' | 'customer_refund' | 'customer_reward' | 'staff_payout' | 'affiliate_payout' | 'platform_payout';
  metadata?: Record<string, any>;
}

interface PaymentArgs {
  amount: number;
  memo: string;
  metadata: Record<string, any>;
  uid: string; // Pi Network user UID
}

/**
 * Step 1: Create A2U payment using pi-backend SDK
 */
async function createA2UPayment(paymentArgs: PaymentArgs): Promise<string | null> {
  console.log('[A2U] Step 1: Creating A2U payment with pi.createPayment...');

  try {
    const PiNetwork = await getPiInstance();

    const PI_API_KEY = process.env.PI_API_KEY;
    const PI_WALLET_PRIVATE_KEY = process.env.PI_WALLET_PRIVATE_KEY;

    if (!PI_API_KEY || !PI_WALLET_PRIVATE_KEY) {
      throw new Error('Pi Network credentials not configured (PI_API_KEY, PI_WALLET_PRIVATE_KEY)');
    }

    const pi = new PiNetwork(PI_API_KEY, PI_WALLET_PRIVATE_KEY);
    console.log('[A2U] Pi SDK initialized');

    const paymentId = await pi.createPayment(paymentArgs);
    console.log('[A2U] ✅ Payment created with ID:', paymentId);

    return paymentId;
  } catch (error: any) {
    console.error('[A2U] ❌ A2U payment creation failed:', error.message);

    if (error.response) {
      console.error('[A2U] Full error response:', JSON.stringify(error.response.data, null, 2));
    }

    return null;
  }
}

/**
 * Step 2: Submit payment to blockchain using pi-backend SDK
 */
async function submitPaymentToBlockchain(paymentId: string): Promise<string | null> {
  console.log('[A2U] Step 2: Submitting payment with pi.submitPayment...');

  try {
    const PiNetwork = await getPiInstance();

    const PI_API_KEY = process.env.PI_API_KEY;
    const PI_WALLET_PRIVATE_KEY = process.env.PI_WALLET_PRIVATE_KEY;

    const pi = new PiNetwork(PI_API_KEY, PI_WALLET_PRIVATE_KEY);

    const txid = await pi.submitPayment(paymentId);
    console.log('[A2U] ✅ Payment submitted with txid:', txid);

    return txid;
  } catch (error: any) {
    console.error('[A2U] ❌ Payment submission failed:', error.message);

    if (error.response) {
      console.error('[AU] Full error response:', JSON.stringify(error.response.data, null, 2));
    }

    return null;
  }
}

/**
 * Step 3: Complete payment in server using pi-backend SDK
 */
async function completePaymentInServer(paymentId: string, txid: string): Promise<any | null> {
  console.log('[A2U] Step 3: Completing payment with pi.completePayment...');

  try {
    const PiNetwork = await getPiInstance();

    const PI_API_KEY = process.env.PI_API_KEY;
    const PI_WALLET_PRIVATE_KEY = process.env.PI_WALLET_PRIVATE_KEY;

    const pi = new PiNetwork(PI_API_KEY, PI_WALLET_PRIVATE_KEY);

    const completedPayment = await pi.completePayment(paymentId, txid);
    console.log('[A2U] ✅ Payment completed:', JSON.stringify(completedPayment.status, null, 2));

    return completedPayment;
  } catch (error: any) {
    console.error('[A2U] ❌ Payment completion failed:', error.message);

    if (error.response) {
      console.error('[A2U] Full error response:', JSON.stringify(error.response.data, null, 2));
    }

    return null;
  }
}

/**
 * Full A2U Payment Flow (All 3 Steps)
 */
async function processFullA2UPayment(paymentArgs: PaymentArgs): Promise<{paymentId: string, txid: string, payment: any} | null> {
  console.log('[A2U] processFullA2UPayment called with:', JSON.stringify(paymentArgs, null, 2));

  try {
    // Step 1: Create payment
    const paymentId = await createA2UPayment(paymentArgs);
    if (!paymentId) {
      console.error('[A2U] Failed to create payment');
      return null;
    }

    // Step 2: Submit to blockchain
    const txid = await submitPaymentToBlockchain(paymentId);
    if (!txid) {
      console.error('[A2U] Failed to submit payment to blockchain');
      return null;
    }

    // Step 3: Complete payment
    const completedPayment = await completePaymentInServer(paymentId, txid);
    if (!completedPayment) {
      console.error('[A2U] Failed to complete payment');
      return null;
    }

    console.log('[A2U] ✅ Full A2U payment process completed successfully');
    return { paymentId, txid, payment: completedPayment };
  } catch (error: any) {
    console.error('[A2U] ❌ Full A2U payment process failed:', error.message);
    return null;
  }
}

export async function processA2UPayment(request: A2UPaymentRequest) {
  try {
    const { uid, amount, memo, transaction_type, metadata = {} } = request;

    console.log(`[A2U] Processing A2U payment:`, { uid, amount, memo, transaction_type });

    // Validation
    if (!uid || !amount || !memo || !transaction_type) {
      return {
        success: false,
        error: 'Missing required fields: uid, amount, memo, transaction_type'
      };
    }

    // Validate transaction type
    const validTransactionTypes = ['merchant_payout', 'customer_refund', 'customer_reward', 'staff_payout', 'affiliate_payout', 'platform_payout'];
    if (!validTransactionTypes.includes(transaction_type)) {
      return {
        success: false,
        error: `Invalid transaction_type. Must be one of: ${validTransactionTypes.join(', ')}`
      };
    }

    // Validate amount
    if (amount <= 0 || amount > 1000) {
      return {
        success: false,
        error: 'Amount must be between 0 and 1000 Pi'
      };
    }

    // Get user by Pi UID
    const userResult = await query(
      `SELECT * FROM users WHERE pi_uid = $1`,
      [uid]
    );

    if (!userResult.rows[0]) {
      return {
        success: false,
        error: 'User not found with this Pi UID'
      };
    }

    const user = userResult.rows[0];

    console.log(`[A2U] Processing A2U payment for user: ${user.username} (${uid})`);
    console.log(`[A2U] Pi Network will resolve wallet address from UID automatically`);

    // Prepare payment args for A2U payment
    const paymentArgs: PaymentArgs = {
      amount,
      memo,
      metadata: {
        type: transaction_type,
        user_id: user.id,
        username: user.username,
        timestamp: Date.now(),
        ...metadata
      },
      uid
    };

    console.log('[A2U] Creating A2U payment with paymentArgs:', JSON.stringify(paymentArgs, null, 2));

    // Use the full A2U payment flow
    const result = await processFullA2UPayment(paymentArgs);

    if (result) {
      console.log('[A2U] ✅ A2U payment completed successfully');
      console.log('   Payment ID:', result.paymentId);
      console.log('   Transaction ID:', result.txid);

      // Create database record for successful payment
      const transactionNumber = `A2U-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

      await query(
        `INSERT INTO a2u_payments (
          transaction_number,
          payment_id,
          to_user_id,
          to_user_type,
          to_user_username,
          to_user_pi_uid,
          amount,
          memo,
          transaction_type,
          metadata,
          status,
          network,
          from_address,
          txid,
          payment_completed_at,
          completed_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        ) RETURNING *`,
        [
          transactionNumber,
          result.paymentId,
          user.id,
          'customer',
          user.username,
          user.pi_uid,
          amount,
          memo,
          transaction_type,
          JSON.stringify(metadata),
          'completed',
          'Pi Testnet',
          'Pi Platform Wallet',
          result.txid,
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );

      console.log('[A2U] ✅ Transaction saved to database:', transactionNumber);

      return {
        success: true,
        payment: {
          paymentId: result.paymentId,
          txid: result.txid,
          amount: amount,
          memo: memo,
          status: 'completed',
          transactionNumber: transactionNumber,
          toUser: {
            id: user.id,
            username: user.username,
            piUid: user.pi_uid
          }
        },
        message: `Successfully sent ${amount} Pi to ${user.username}!`
      };
    } else {
      console.error('[A2U] ❌ A2U payment failed');
      return {
        success: false,
        error: 'A2U payment failed. Please check server logs for details.'
      };
    }

  } catch (error) {
    console.error('[A2U] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}