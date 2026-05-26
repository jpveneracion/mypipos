/**
 * A2U Payment Library
 * Shared logic for processing A2U (App-to-User) payments
 */

import { query } from '@/lib/db';

export interface A2UPaymentRequest {
  uid: string;
  amount: number;
  memo: string;
  transaction_type: 'merchant_payout' | 'customer_refund' | 'customer_reward' | 'staff_payout' | 'affiliate_payout' | 'platform_payout';
  metadata?: Record<string, any>;
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

    // Check if user has wallet address
    if (!user.pi_wallet_address) {
      return {
        success: false,
        error: 'User does not have a wallet address set'
      };
    }

    // Get API credentials
    const apiKey = process.env.PI_API_KEY;
    const apiWalletAddress = process.env.PI_WALLET_ADDRESS;
    const piApiUrl = process.env.PI_API_URL || 'https://api.minepi.com/v2';

    if (!apiKey) {
      return {
        success: false,
        error: 'Pi Network API key not configured'
      };
    }

    // Step 1: Create A2U payment record in database
    const transactionNumber = `A2U-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    const a2uPaymentResult = await query(
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
        to_address
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *`,
      [
        transactionNumber,
        '', // Will be set after Pi API call
        user.id,
        'customer', // Default to customer
        user.username,
        user.pi_uid,
        amount,
        memo,
        transaction_type,
        JSON.stringify(metadata),
        'pending',
        'Pi Testnet',
        apiWalletAddress,
        user.pi_wallet_address
      ]
    );

    const a2uPayment = a2uPaymentResult.rows[0];

    console.log(`[A2U] Created A2U payment record:`, a2uPayment.transaction_number);

    // Step 2: Create payment on Pi Network
    console.log(`[A2U] Creating payment on Pi Network...`);

    const piPaymentData = {
      amount: amount.toFixed(7),
      memo: memo,
      metadata: {
        transaction_id: transactionNumber,
        user_id: user.id,
        ...metadata
      }
    };

    const piApiResponse = await fetch(`${piApiUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify(piPaymentData)
    });

    if (!piApiResponse.ok) {
      const errorText = await piApiResponse.text();
      console.error(`[A2U] Pi API error:`, errorText);

      // Update A2U payment as failed
      await query(
        `UPDATE a2u_payments SET status = 'failed', error_message = $1 WHERE id = $2`,
        [errorText, a2uPayment.id]
      );

      return {
        success: false,
        error: `Failed to create payment on Pi Network: ${errorText}`
      };
    }

    const piApiResult = await piApiResponse.json();
    console.log(`[A2U] Pi Network payment created:`, piApiResult);

    // Step 3: Update A2U payment with Pi Network payment ID
    await query(
      `UPDATE a2u_payments SET
        payment_id = $1,
        status = 'creating'
      WHERE id = $2`,
      [piApiResult.payment_id || piApiResult.identifier, a2uPayment.id]
    );

    // Step 4: Submit payment to blockchain
    console.log(`[A2U] Submitting payment to blockchain...`);

    const submitResponse = await fetch(`${piApiUrl}/payments/${piApiResult.payment_id || piApiResult.identifier}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
      }
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error(`[A2U] Submit error:`, errorText);

      await query(
        `UPDATE a2u_payments SET status = 'failed', error_message = $1 WHERE id = $2`,
        [`Submit failed: ${errorText}`, a2uPayment.id]
      );

      return {
        success: false,
        error: `Failed to submit payment: ${errorText}`
      };
    }

    const submitResult = await submitResponse.json();
    console.log(`[A2U] Payment submitted to blockchain:`, submitResult);

    // Step 5: Update A2U payment as completed
    await query(
      `UPDATE a2u_payments SET
        status = 'completed',
        txid = $1,
        payment_completed_at = NOW(),
        completed_at = NOW()
      WHERE id = $2`,
      [submitResult.txid, a2uPayment.id]
    );

    console.log(`[A2U] ✅ A2U payment completed successfully!`);

    return {
      success: true,
      payment: {
        id: a2uPayment.id,
        transactionNumber: a2uPayment.transaction_number,
        paymentId: piApiResult.payment_id || piApiResult.identifier,
        txid: submitResult.txid,
        amount: a2uPayment.amount,
        memo: a2uPayment.memo,
        status: 'completed',
        toUser: {
          id: user.id,
          username: user.username,
          piUid: user.pi_uid
        }
      },
      message: `Successfully sent ${amount} Pi to ${user.username}!`
    };

  } catch (error) {
    console.error('[A2U] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}